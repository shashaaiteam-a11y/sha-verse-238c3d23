import { describe, it, expect } from "vitest";
import { isGarbageLine, isBoilerplate, assessPageText, devanagariLooksBroken } from "@/lib/reader/quality";

describe("reader quality", () => {
  it("flags glyph soup", () => {
    expect(isGarbageLine("i = HE EE | v' : TEE egy. ih = el HE ; : 1 i SAR ii] ik LE el 2 | IEE : oN Fl 1 La He JR")).toBe(true);
    expect(isGarbageLine("WEDDILEK Re Bnenaage thai gy | WH = te iA i Fa WY \\ 5 I ea BH | FRANK V. | sd")).toBe(true);
    expect(isGarbageLine("TN RL) \" 7 | | 4 n= |B IE 1 HAUNTED\" | VILLA 1 Written by")).toBe(true);
  });
  it("keeps real prose", () => {
    expect(isGarbageLine("The two boys walked slowly along the mountain trail, wondering where the gold had gone.")).toBe(false);
    expect(isGarbageLine("It was a bright cold day in April, and the clocks were striking thirteen.")).toBe(false);
  });
  it("flags gutenberg boilerplate", () => {
    expect(isBoilerplate("The Project Gutenberg EBook of Two Boy Gold Miners, by Frank V. Webster")).toBe(true);
    expect(isBoilerplate("www.gutenberg.org/license Title: Two Boy Gold Miners")).toBe(true);
    expect(isBoilerplate("Produced by Juliet Sutherland, Mary Meehan and the Online Distributed Proofreading Team")).toBe(true);
    expect(isBoilerplate("Chapter One: The Old Mine")).toBe(false);
  });
  it("detects broken hindi", () => {
    expect(devanagariLooksBroken("सदश क बआ क तबयत अचानक खराब हन क खबर मलन पर वो और उसक प उनका हाल जानन उनक घर गए")).toBe(true);
    expect(devanagariLooksBroken("सुदेश की बुआ की तबियत अचानक खराब होने की खबर मिलने पर वो और उसके पिता उनका हाल जानने उनके घर गए")).toBe(false);
  });
  it("page verdicts", () => {
    expect(assessPageText(["i = HE EE | v' : TEE egy.", "ih = el HE ; : 1 i SAR ii]", "WH = te iA i Fa WY", "5 I ea BH | FRANK V. | sd"]).unusable).toBe(true);
    expect(assessPageText(["The two boys walked slowly along the trail.", "They had been searching for weeks without luck.", "Now the mountains rose before them."]).unusable).toBe(false);
    expect(assessPageText(["Normal line \uE001\uE002\uE003\uE004\uE005 more \uE006\uE007"]).reason).toBe("glyph-damage");
  });
});
