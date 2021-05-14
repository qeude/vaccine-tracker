import axios from "axios";
import { VaccineCenter } from "../models/VaccineCenter";

export const fetch = async (
  selectedRegion: string
): Promise<VaccineCenter[]> => {
  return axios
    .get(`https://vitemadose.gitlab.io/vitemadose/${selectedRegion}.json`)
    .then((response) => {
      const data = response.data.centres_disponibles;
      return data.map(
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
    })
    .catch((error) => {
      console.error(error);
    });
};
