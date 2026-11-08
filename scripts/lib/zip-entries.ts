import * as fs from 'fs';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_ENTRY_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const ZIP64_MARKER = 0xffffffff;

/**
 * Nomes das entradas de um zip lidos só do diretório central, no fim do arquivo: o jar
 * não é carregado inteiro na memória. Não entende zip64 (jars de mod não chegam lá);
 * arquivo que não é zip ou usa zip64 lança erro.
 */
export function readZipEntryNames(file: string): string[] {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const tail = Buffer.alloc(Math.min(size, EOCD_MIN_SIZE + MAX_COMMENT_SIZE));
    fs.readSync(fd, tail, 0, tail.length, size - tail.length);

    let eocd = -1;
    for (let i = tail.length - EOCD_MIN_SIZE; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIGNATURE) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) throw new Error('fim do diretório central não encontrado');
    const centralSize = tail.readUInt32LE(eocd + 12);
    const centralOffset = tail.readUInt32LE(eocd + 16);
    if (centralSize === ZIP64_MARKER || centralOffset === ZIP64_MARKER) throw new Error('zip64 não suportado');

    const central = Buffer.alloc(centralSize);
    fs.readSync(fd, central, 0, centralSize, centralOffset);
    const names: string[] = [];
    let pos = 0;
    while (pos < centralSize) {
      if (central.readUInt32LE(pos) !== CENTRAL_ENTRY_SIGNATURE) throw new Error('diretório central corrompido');
      const nameLength = central.readUInt16LE(pos + 28);
      const extraLength = central.readUInt16LE(pos + 30);
      const commentLength = central.readUInt16LE(pos + 32);
      names.push(central.toString('utf8', pos + 46, pos + 46 + nameLength));
      pos += 46 + nameLength + extraLength + commentLength;
    }
    return names;
  } finally {
    fs.closeSync(fd);
  }
}
