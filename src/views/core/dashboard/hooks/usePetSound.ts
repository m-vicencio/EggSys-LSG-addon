"use client";

import { useCallback } from "react";
import type { PetData } from "@/lib/api";

export function usePetSound(pet: PetData | undefined, currentStageName: string) {
  const playPetSound = useCallback(() => {
    if (!pet) return;

    let soundPath = "";
    if (currentStageName === "egg" || currentStageName === "cruzada1") {
      soundPath = "/sound/egg_sound_1.mp3";
    } else if (currentStageName === "cruzada2" || currentStageName === "cruzada3") {
      soundPath = "/sound/egg_sound_2.mp3";
    } else if (currentStageName === "hatched" || currentStageName === "pet") {
      switch (pet.petType?.toLowerCase()) {
        case "bunny":
          soundPath = "/sound/bunny_sound.mp3";
          break;
        case "cat":
          soundPath = "/sound/cat_sound.mp3";
          break;
        case "panda":
          soundPath = "/sound/panda_sound.mp3";
          break;
        case "hedgehog":
          soundPath = "/sound/hedgehog_sound.mp3";
          break;
        default:
          soundPath = "/sound/bunny_sound.mp3";
      }
    }

    if (soundPath) {
      const audio = new Audio(soundPath);
      audio.play().catch((err) =>
        console.log("Error al reproducir el sonido:", err),
      );
      
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, [pet, currentStageName]);

  return { playPetSound };
}
