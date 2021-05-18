import "./utils/env";
import { App, LogLevel } from "@slack/bolt";
import { VaccineCenter } from "./models/VaccineCenter";
import { scheduleJob } from "node-schedule";
import { buildSetRegionModal } from "./ui/SetRegion";
import { buildBlocksForMessage } from "./ui/Message";
import { fetch } from "./services/api";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

let selectedRegion: string = "44";
let vaccineCenters: VaccineCenter[] = [];

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
  const channels = await getChannels(app);
  channels.forEach((channel) => {
    app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channel,
      text: "De nouveaux créneaux sont disponibles !",
      blocks: buildBlocksForMessage(centers),
    });
  });
};

const getVaccinesCentersToNotify = (
  centers: VaccineCenter[]
): VaccineCenter[] => {
  return centers.filter((center) => {
    const oldCenter = vaccineCenters.find((element) => element.id == center.id);
    console.log(`oldCenter: ${oldCenter}`);
    console.log(`center: ${center}`);
    console.log(`oldCenter chronodoses: ${oldCenter?.available_chronodoses}`);
    console.log(`center chronodoses: ${center.available_chronodoses}`);
    if (oldCenter === undefined || oldCenter === null) {
      return false;
    } else {
      return center.available_chronodoses > oldCenter.available_chronodoses;
    }
  });
};

app.command("/set_region", async ({ command, ack, client }) => {
  try {
    // Acknowledge shortcut request
    await ack();
    const test = await buildSetRegionModal(command, selectedRegion);
    const result = await client.views.open(JSON.parse(JSON.stringify(test)));
  } catch (error) {
    console.error(error);
  }
});

app.view("set_region_view", async ({ ack, body, view, client }) => {
  await ack();
  const value =
    view["state"]["values"]["set-region-input"]["set-region-action"][
      "selected_option"
    ]["value"];
  selectedRegion = value;
  vaccineCenters = [];
  fetch(selectedRegion).then((centers) => {
    vaccineCenters = centers;
  });
});

app.command("/region", async ({ command, ack, say }) => {
  await ack();
  await say(`La région sélectionnée est: *${selectedRegion}*`);
});

(async () => {
  // Start your app
  await app.start(Number(process.env.PORT) || 3000);

  var event = scheduleJob("*/30 * * * * *", () => {
    fetch(selectedRegion).then((centers) => {
      const centersToNotify = getVaccinesCentersToNotify(centers);
      if (centersToNotify.length > 0) {
        sendMessage(app, centersToNotify);
      }
      vaccineCenters = centers;
    });
  });
  console.log("⚡️ Bolt app is running!");
})();
