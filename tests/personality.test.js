import { describe, expect, test } from "@jest/globals";

import { Personality, PERSONALITY } from "../src/classes/personality.js";

describe("Personality", () => {
  test("Singleton exists", () => {
    expect(PERSONALITY).toBeDefined();
    expect(PERSONALITY).toBeInstanceOf(Personality);
  });

  const personalities = ["nom", "fun"];
  const perso = {}
  const p = new Personality("nom", "personalité", "administratif", "annonces", "couleurs", personalities);

  test("Correct init", () => {
    expect(p.name).toBe("nom");
    expect(p.personality).toBe("personalité");
    expect(p.admin).toBe("administratif");
    expect(p.announces).toBe("annonces");
    expect(p.colors).toBe("couleurs");
  });

  test("setPersonality", () => {
    p.setPersonality("fun", perso);
    expect(p.name).toBe("fun");
    expect(p.personality).toStrictEqual(perso);
  });

  test("getPersonnality", () => {
    expect(p.getPersonality()).toStrictEqual(perso);
  });

  test("getName", () => {
    expect(p.getName()).toBe("fun");
  });

  test("getAdmin", () => {
    expect(p.getAdmin()).toBe("administratif");
  });

  test("getAnnounces", () => {
    expect(p.getAnnounces()).toBe("annonces");
  });

  test("getColors", () => {
    expect(p.getColors()).toBe("couleurs");
  });
})
