"use client";

import type { PetData } from "@/lib/api";

export function usePetMessages(
  pet: PetData | undefined,
  currentStageName: string,
  saldo?: string,
) {
  const getRandomMessage = (messages: string[]): string => {
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getPetMessage = (): string => {
    if (!pet) return "...";

    const petType = pet.petType?.toLowerCase() ?? "bunny";
    const balance = saldo ?? "tu dinero";

    // Mensajes por etapa
    if (currentStageName === "egg") {
      return getRandomMessage([
        "🎵 (Se escucha algo adentro...)",
        "¡Ya casi salgo! 🐣",
        "Tap tap tap... ¿hay alguien?",
        "Parece que algo se mueve... 👀",
      ]);
    }

    if (currentStageName === "cruzada1") {
      return getRandomMessage([
        "¡Casi estoy listo! 💪",
        "Creciendo... un poquito más",
        "La transformación va bien 🌱",
        "Cada día más fuerte",
      ]);
    }

    if (currentStageName === "cruzada2") {
      return getRandomMessage([
        "¡En la mitad del camino! 🚀",
        "Ya casi soy completamente yo 🔄",
        "Cambios importantes en progreso",
        "Casi listo para el mundo 🌍",
      ]);
    }

    if (currentStageName === "cruzada3") {
      return getRandomMessage([
        "¡Los últimos retoques! ✨",
        "¡Mañana soy libre! 🦅",
        "Estoy muy emocionado 😍",
        "¡Casi... casi... casi!",
      ]);
    }

    if (currentStageName === "hatched" || currentStageName === "pet") {
      switch (petType) {
        case "bunny":
          return getRandomMessage([
            "🥕 Ahorrando para más zanahorias",
            `¡Llevamos ${balance}! Vamos que se puede 🐰`,
            "Un conejo feliz es un conejo ahorrativo 💰",
            "¡Hop hop! ¡La meta se acerca! 🎯",
          ]);
        case "cat":
          return getRandomMessage([
            "😸 Maullando por tu éxito financiero",
            `¡${balance} de puro felino! 🐱`,
            "Este gato sabe de ahorros 💎",
            "Maúu~ ¡Seguimos adelante! 🌟",
          ]);
        case "panda":
          return getRandomMessage([
            "🎋 Comiendo bambúes de éxito",
            `¡${balance}! ¡Eso es bambú de calidad! 🐼`,
            "Los pandas somos expertos en ahorro 🏆",
            "Relajado pero enfocado en la meta 😌",
          ]);
        case "hedgehog":
          return getRandomMessage([
            "🌰 Coleccionando ahorros como bellotas",
            `¡${balance} de espinas de éxito! 🦔`,
            "Un erizo nunca deja de prepararse",
            "¡Rollin' hacia el éxito! 🎯",
          ]);
        default:
          return getRandomMessage([
            `¡${balance}! ¡Vamo' que se puede! 💪`,
            "La meta está cada vez más cerca 🚀",
            "¡Tu apoyo me hace fuerte! 🌟",
          ]);
      }
    }

    return "¡Hola! 👋";
  };

  return { getPetMessage };
}
