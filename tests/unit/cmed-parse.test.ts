import { describe, it, expect } from "vitest";
import { DosageForm } from "@prisma/client";
import { parseApresentacao, mapCmedRow, findHeaderRowIndex } from "@/lib/medications/cmed-parse";

describe("parseApresentacao", () => {
  it("extracts mg dose from a coated tablet (COM REV)", () => {
    expect(parseApresentacao("50 MG COM REV CT BL AL PLAS OPC X 30")).toEqual({
      dosage: "50 MG",
      form: DosageForm.TABLET,
    });
  });

  it("extracts mg/ml from oral solution", () => {
    expect(parseApresentacao("10 MG/ML SOL ORAL CT FR PLAS OPC X 100 ML")).toEqual({
      dosage: "10 MG/ML",
      form: DosageForm.LIQUID,
    });
  });

  it("recognizes drops (GTS)", () => {
    expect(parseApresentacao("200 MG/ML SOL OR GTS CT FR PLAS X 20 ML")).toEqual({
      dosage: "200 MG/ML SOL OR",
      form: DosageForm.DROPS,
    });
  });

  it("recognizes injectable", () => {
    expect(parseApresentacao("500 MG PO LIOF INJ CT FA VD INC + AMP DIL X 5 ML")).toEqual({
      dosage: "500 MG",
      form: DosageForm.INJECTION,
    });
  });

  it("recognizes capsule", () => {
    expect(parseApresentacao("20 MG CAP DURA CT BL AL PLAS OPC X 28")).toEqual({
      dosage: "20 MG",
      form: DosageForm.CAPSULE,
    });
  });

  it("recognizes cream", () => {
    expect(parseApresentacao("0,1% CR DERM CT BG AL X 30 G")).toEqual({
      dosage: "0,1%",
      form: DosageForm.CREAM,
    });
  });

  it("falls back to OTHER for unknown forms (kit/non-pharma context)", () => {
    expect(parseApresentacao("CONJUNTO COM ACESSORIOS")).toEqual({
      dosage: "CONJUNTO COM ACESSORIOS",
      form: DosageForm.OTHER,
    });
  });

  it("handles combo doses", () => {
    expect(parseApresentacao("0,5 MG + 25 MG COM CT BL AL AL X 30")).toEqual({
      dosage: "0,5 MG + 25 MG",
      form: DosageForm.TABLET,
    });
  });
});

describe("mapCmedRow", () => {
  it("returns null when key fields are missing", () => {
    expect(mapCmedRow({})).toBeNull();
    expect(mapCmedRow({ "PRODUTO": "X", "APRESENTAÇÃO": "Y" })).toBeNull();
  });

  it("maps a complete row", () => {
    const row = {
      "CÓDIGO GGREM": "501234567890123",
      "SUBSTÂNCIA": "Losartana Potássica",
      "PRODUTO": "Losartana",
      "APRESENTAÇÃO": "50 MG COM REV CT BL AL PLAS OPC X 30",
      "CNPJ": "57.507.378/0003-65",
      "LABORATÓRIO": "EMS S.A.",
      "REGISTRO": "1235600100015",
      "EAN 1": "7896004700571",
      "CLASSE TERAPÊUTICA": "C09CA01 - LOSARTANA",
      "TIPO DE PRODUTO (STATUS DO PRODUTO)": "GENÉRICO",
      "PMC 0%": "12,3456",
      "PMC 22%": "15,8901",
    };
    expect(mapCmedRow(row)).toMatchObject({
      cmedGgrem: "501234567890123",
      activeIngredient: "Losartana Potássica",
      brandName: "Losartana",
      dosage: "50 MG",
      form: DosageForm.TABLET,
      manufacturerName: "EMS S.A.",
      manufacturerCnpj: "57507378000365",
      anvisaCode: "1235600100015",
      ean: "7896004700571",
      therapeuticClass: "C09CA01 - LOSARTANA",
      productType: "GENÉRICO",
      pmcMax: 15.8901,
    });
  });

  it("handles missing optional columns", () => {
    const row = {
      "CÓDIGO GGREM": "501234567890123",
      "SUBSTÂNCIA": "Dipirona",
      "PRODUTO": "Novalgina",
      "APRESENTAÇÃO": "500 MG COM",
    };
    const r = mapCmedRow(row);
    expect(r).not.toBeNull();
    expect(r?.manufacturerCnpj).toBeNull();
    expect(r?.ean).toBeNull();
    expect(r?.pmcMax).toBeNull();
  });
});

describe("findHeaderRowIndex", () => {
  it("finds the header row when present", () => {
    const matrix: unknown[][] = [
      ["DADOS COMPILADOS PELA CMED EM ..."],
      [],
      ["SUBSTÂNCIA", "CNPJ", "LABORATÓRIO", "CÓDIGO GGREM", "REGISTRO"],
      ["Losartana", "57507378000365", "EMS", "501234567890123", "1235600100015"],
    ];
    expect(findHeaderRowIndex(matrix)).toBe(2);
  });

  it("returns -1 when no header row", () => {
    expect(findHeaderRowIndex([["random"], ["data"]])).toBe(-1);
  });
});
