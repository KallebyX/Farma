import { describe, it, expect } from "vitest";
import { parseCsv, parseCmedCsv } from "@/lib/medications/cmed-import";

describe("parseCsv", () => {
  it("parses semicolon-delimited rows", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("respects quoted fields with embedded separators", () => {
    expect(parseCsv('a;"b;c";d')).toEqual([["a", "b;c", "d"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("escapes doubled quotes inside quoted fields", () => {
    expect(parseCsv('"He said ""hi""";next')).toEqual([['He said "hi"', "next"]]);
  });

  it("supports configurable separator", () => {
    expect(parseCsv("a,b,c\n1,2,3", ",")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });
});

describe("parseCmedCsv", () => {
  it("parses a small CMED-shaped CSV with metadata header rows", () => {
    const csv = [
      "DADOS COMPILADOS PELA CMED",
      "Atualizado em ...",
      "",
      "SUBSTÂNCIA;CNPJ;LABORATÓRIO;CÓDIGO GGREM;REGISTRO;EAN 1;PRODUTO;APRESENTAÇÃO;CLASSE TERAPÊUTICA;TIPO DE PRODUTO (STATUS DO PRODUTO);PMC 0%;PMC 22%",
      "Losartana Potássica;57.507.378/0003-65;EMS S.A.;501234567890123;1235600100015;7896004700571;Losartana;50 MG COM REV CT BL AL PLAS OPC X 30;C09CA01 - LOSARTANA;GENÉRICO;12,3456;15,8901",
      "Dipirona Sódica;57.507.378/0003-65;EMS S.A.;501234567890456;1235600100016;7896004700572;Dipirona;500 MG COM CT BL AL X 20;N02BB02 - DIPIRONA;GENÉRICO;5,1234;6,7890",
    ].join("\n");

    const entries = parseCmedCsv(csv);
    expect(entries).toHaveLength(2);
    expect(entries[0].cmedGgrem).toBe("501234567890123");
    expect(entries[0].brandName).toBe("Losartana");
    expect(entries[0].dosage).toBe("50 MG");
    expect(entries[0].pmcMax).toBe(15.8901);
    expect(entries[1].activeIngredient).toBe("Dipirona Sódica");
  });

  it("throws when header row is not found", () => {
    expect(() => parseCmedCsv("just;some;random;text")).toThrow(/cabeçalho/);
  });
});
