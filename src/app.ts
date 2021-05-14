import "./utils/env";
import { App, LogLevel } from "@slack/bolt";
import { VaccineCenter } from "./models/VaccineCenter";
import { scheduleJob } from "node-schedule";
import axios from "axios";
import { getRegionCodes } from "./utils/Utils";
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

let region: string = "44";
let vaccineCenters: VaccineCenter[] = [];
//FIXME: should delete this later
let callNumbers = 0;
const fetch = async (): Promise<VaccineCenter[]> => {
  return axios
    .get(`https://vitemadose.gitlab.io/vitemadose/${region}.json`)
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
      //FIXME: should delete this later
      centers[0].available_chronodoses =
        centers[0].available_chronodoses + callNumbers;
      centers[1].available_chronodoses =
        centers[1].available_chronodoses + callNumbers;
      callNumbers++;
      return centers;
    })
    .catch((error) => {
      console.error(error);
    });
};

const sendMessage = (app: App, centers: VaccineCenter[]) => {
  const centersBlocks = centers.flatMap((center) =>
    computeBlockForVaccineCenter(center)
  );
  app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: "nothing",
    text: "De nouveaux créneaux sont disponibles !",
    blocks: buildBaseBlocks().concat(centersBlocks),
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

(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  var event = scheduleJob("*/1 * * * * *", () => {
    fetch().then((centers) => {
      console.log("fetched centers 🎉");
      const centersToNotify = getVaccinesCentersToNotify(centers);
      if (centersToNotify.length > 0) {
        sendMessage(app, centersToNotify);
      }
      vaccineCenters = centers;
    });
  });
  console.log("⚡️ Bolt app is running!");
})();
