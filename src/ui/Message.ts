import { VaccineCenter } from "../models/VaccineCenter";

export const buildBlocksForMessage = (centers: VaccineCenter[]) => {
  const centersBlocks = centers.flatMap((center) =>
    computeBlockForVaccineCenter(center)
  );
  return buildBaseBlocks().concat(centersBlocks);
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
