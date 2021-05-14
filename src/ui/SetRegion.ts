import { getRegionCodes } from "../utils/Utils";
import { Option, SlashCommand } from "@slack/bolt";

export const buildSetRegionModal = async (
  command: SlashCommand,
  selectedRegion: string
) => {
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
  return {
    trigger_id: command.trigger_id,
    view: {
      callback_id: "set_region_view",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Modifier la region",
      },
      submit: {
        type: "plain_text",
        text: "Valider",
      },
      close: {
        type: "plain_text",
        text: "Fermer",
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `La region actuelle est: *${selectedRegion}*.\n Voulez vous la modifier ?`,
          },
        },
        {
          type: "input",
          block_id: "set-region-input",
          element: {
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: "Selectionnez une région.",
              emoji: true,
            },
            options: optionBlocks,
            action_id: "set-region-action",
          },
          label: {
            type: "plain_text",
            text: "Région",
            emoji: true,
          },
        },
      ],
    },
  };
};
