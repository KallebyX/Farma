/**
 * Heuristic DETECTION of a digital signature on an uploaded prescription.
 *
 * Full ICP-Brasil validation (verifying the signer's certificate against the
 * official ICP-Brasil trust chain, CRL/OCSP, and the CAdES/PAdES structure)
 * requires the ICP-Brasil root certificates + a validation library or a
 * credentialed validation service. That step is gated behind credentials; here
 * we only detect whether a signature is present so the prescription can become a
 * pharmacy "lead". The result maps to PrescriptionSignature.
 */

export type SignatureDetection = { signed: boolean; note: string };

export function detectSignature(bytes: Uint8Array, mimeType: string, fileName: string): SignatureDetection {
  const name = fileName.toLowerCase();
  const mt = (mimeType || "").toLowerCase();

  // Detached CAdES signature (.p7s / PKCS#7 / CMS)
  if (name.endsWith(".p7s") || mt.includes("pkcs7") || mt.includes("cms")) {
    return { signed: true, note: "Assinatura CAdES (.p7s) detectada — validação ICP-Brasil pendente de credenciais." };
  }

  // PAdES signature embedded in a PDF — the signature dictionary (/ByteRange,
  // /Type /Sig, adbe.pkcs7.* / ETSI.CAdES) usually lives near the file's end.
  if (mt.includes("pdf") || (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50)) { // %P
    const toStr = (start: number, end: number) => Buffer.from(bytes.subarray(Math.max(0, start), Math.min(bytes.length, end))).toString("latin1");
    const window = bytes.length <= 400_000 ? toStr(0, bytes.length) : toStr(0, 200_000) + toStr(bytes.length - 200_000, bytes.length);
    const signed = /\/ByteRange|\/Type\s*\/Sig|adbe\.pkcs7|ETSI\.CAdES|ETSI\.RFC3161/i.test(window);
    return signed
      ? { signed: true, note: "Assinatura digital (PAdES) detectada no PDF — validação ICP-Brasil pendente de credenciais." }
      : { signed: false, note: "Nenhuma assinatura digital detectada — receita comum (não qualificada)." };
  }

  return { signed: false, note: "Formato sem assinatura digital detectável." };
}
