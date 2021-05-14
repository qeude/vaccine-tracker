import "./utils/env";
import { App, LogLevel, Option } from "@slack/bolt";
import { VaccineCenter } from "./models/VaccineCenter";
import { scheduleJob } from "node-schedule";
import axios from "axios";
import { getRegionCodes } from "./utils/Utils";
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

let selectedRegion: string = "44";
let vaccineCenters: VaccineCenter[] = [];
const fetch = async (): Promise<VaccineCenter[]> => {
  return axios
    .get(`https://vitemadose.gitlab.io/vitemadose/${selectedRegion}.json`)
    .then((response) => {
      const data = response.data.centres_disponibles;
      let centers = data.map(
        (element: any) =>
          new VaccineCenter(
            element.gid,
            element.url,
            element.nom,
            element.location.cp,
            element.location.city,
            element.vaccine_type,
            element.appointment_schedules.find(
              (schedule: any) => schedule.name == "chronodose"
            ).total,
            element.plateforme
          )
      );
      return centers;
    })
    .catch((error) => {
      console.error(error);
    });
};

const getChannels = async (app: App): Promise<string[]> => {
  const channels = await app.client.conversations.list({
    token: process.env.SLACK_BOT_TOKEN,
    exclude_archived: true,
  });
  return (channels.channels ?? [])
    .filter((elt) => elt.is_member && elt.is_channel && elt.name !== undefined)
    .map((elt) => elt.name ?? "");
};

const sendMessage = async (app: App, centers: VaccineCenter[]) => {
  const centersBlocks = centers.flatMap((center) =>
    computeBlockForVaccineCenter(center)
  );
  const channels = await getChannels(app);
  channels.forEach((channel) => {
    app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channel,
      text: "De nouveaux créneaux sont disponibles !",
      blocks: buildBaseBlocks().concat(centersBlocks),
    });
  });
};

const buildBaseBlocks = () => {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*De nouveaux créneaux sont disponibles !* 🎉",
      },
    },
    {
      type: "divider",
    },
  ];
};

const computeBlockForVaccineCenter = (center: VaccineCenter) => {
  const vaccineTypes = center.vaccine_types
    .map((type) => `💉 ${type}`)
    .join("\n");
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${center.name}*\n ${center.city} - ${center.postal_code}\n ${vaccineTypes}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `Aller sur le site de ${center.platform}`,
            emoji: true,
          },
          value: `button-${center.id}`,
          url: center.url,
          action_id: `button-${center.id}`,
        },
      ],
    },
  ];
};

const getVaccinesCentersToNotify = (
  centers: VaccineCenter[]
): VaccineCenter[] => {
  return centers.filter((center) => {
    const oldCenter = vaccineCenters.find(
      (element) => (element.id = center.id)
    );
    return (
      center.available_chronodoses > (oldCenter?.available_chronodoses ?? 0)
    );
  });
};

app.message("/set_region");

app.command("/region", async ({ command, ack, client }) => {
  try {
    // Acknowledge shortcut request
    await ack();
    const optionBlocks: Option[] = getRegionCodes().map((elt) => {
      return {
        text: {
          type: "plain_text",
          text: elt,
          emoji: true,
        },
        value: elt,
      };
    });
    const result = await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "My App",
        },
        close: {
          type: "plain_text",
          text: "Close",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `La region actuelle est: ${selectedRegion}.\n Voulez vous la modifier ?`,
            },
          },
          {
            type: "input",
            element: {
              type: "static_select",
              placeholder: {
                type: "plain_text",
                text: "Selectionnez une région.",
                emoji: true,
              },
              options: optionBlocks,
              action_id: "static_select-action",
            },
            label: {
              type: "plain_text",
              text: "Région",
              emoji: true,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Valider",
                  emoji: true,
                },
                value: `button-submit-region`,
                action_id: `button-submit-region`,
              },
            ],
          },
        ],
      },
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  var event = scheduleJob("*/10 * * * *", () => {
    fetch().then((centers) => {
      console.log("fetched centers 🎉");
      const centersToNotify = getVaccinesCentersToNotify(centers);
      if (centersToNotify.length > 0) {
        sendMessage(app, centersToNotify);
      }
      vaccineCenters = centers;
    });
  });
  console.log(`${JSON.stringify(app.client.bots)}`);
  console.log("⚡️ Bolt app is running!");
})();
