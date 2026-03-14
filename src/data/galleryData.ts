import belarusPhoto from "../assets/belarus.png";
import entrepreneurBackdrop from "../assets/entrepreneur-backdrop.png";
import entrepreneurCheck from "../assets/entrepreneur-check.png";
import entrepreneurEvent from "../assets/entrepreneur-event.png";
import entrepreneurPitch from "../assets/entrepreneur-pitch.png";
import mosquePhoto from "../assets/mosque.png";
import summitPhoto from "../assets/summit.png";
import tanzaniaPhoto from "../assets/tanzania.png";
import watsonPhoto from "../assets/watson.png";
import winnerPhoto from "../assets/winner.png";

export type ProgramKey = "econ" | "pitch";

export type GalleryImage = {
  src: string;
  alt: string;
  program: ProgramKey;
};

export const econImages: GalleryImage[] = [
  {
    src: summitPhoto,
    alt: "International Economic Summit event floor",
    program: "econ",
  },
  {
    src: winnerPhoto,
    alt: "International Economic Summit winning team",
    program: "econ",
  },
  {
    src: mosquePhoto,
    alt: "Students presenting summit cultural project",
    program: "econ",
  },
  {
    src: watsonPhoto,
    alt: "Students at International Economic Summit booth",
    program: "econ",
  },
  {
    src: tanzaniaPhoto,
    alt: "Summit team recognized for Tanzania project",
    program: "econ",
  },
  {
    src: belarusPhoto,
    alt: "Students in cultural attire at summit event",
    program: "econ",
  },
];

export const pitchImages: GalleryImage[] = [
  {
    src: entrepreneurEvent,
    alt: "Entrepreneurs Challenge event stage",
    program: "pitch",
  },
  {
    src: entrepreneurCheck,
    alt: "Entrepreneurs Challenge winning check photo",
    program: "pitch",
  },
  {
    src: entrepreneurPitch,
    alt: "Students pitching Loba Boba product",
    program: "pitch",
  },
  {
    src: entrepreneurBackdrop,
    alt: "Entrepreneurs Challenge logo backdrop",
    program: "pitch",
  },
];

export const homeMenuImages: GalleryImage[] = [
  {
    src: entrepreneurPitch,
    alt: "Students pitching Loba Boba product",
    program: "pitch",
  },
  {
    src: summitPhoto,
    alt: "International Economic Summit event floor",
    program: "econ",
  },
  {
    src: mosquePhoto,
    alt: "Students presenting summit cultural project",
    program: "econ",
  },
];

export const homeMissionImages: GalleryImage[] = [
  {
    src: tanzaniaPhoto,
    alt: "Summit team recognized for Tanzania project",
    program: "econ",
  },
  {
    src: winnerPhoto,
    alt: "International Economic Summit winning team",
    program: "econ",
  },
  {
    src: watsonPhoto,
    alt: "Students at International Economic Summit booth",
    program: "econ",
  },
  {
    src: entrepreneurCheck,
    alt: "Entrepreneurs Challenge winning check photo",
    program: "pitch",
  },
];

export const mixedGalleryImages: GalleryImage[] = [
  pitchImages[2],
  econImages[0],
  econImages[2],
  econImages[1],
  pitchImages[3],
  econImages[4],
  pitchImages[1],
  econImages[3],
  pitchImages[0],
  econImages[5],
];

export function buildMixedGallery() {
  return mixedGalleryImages;
}
