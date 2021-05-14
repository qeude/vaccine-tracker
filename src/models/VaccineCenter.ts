export class VaccineCenter {
  id: string;
  url: string;
  name: string;
  postal_code: number;
  city: string;
  vaccine_types: string[];
  available_chronodoses: number;
  platform: string;

  constructor(
    id: string,
    url: string,
    name: string,
    postal_code: number,
    city: string,
    vaccine_types: string[],
    available_chronodoses: number,
    platform: string
  ) {
    this.id = id;
    this.url = url;
    this.name = name;
    this.postal_code = postal_code;
    this.city = city;
    this.vaccine_types = vaccine_types;
    this.available_chronodoses = available_chronodoses;
    this.platform = platform;
  }
}
