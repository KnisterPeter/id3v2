import { readFileSync } from 'fs';
import * as iconv from 'iconv-lite';

/*
 * Reading of ID3 tag based on http://id3.org/
 */

const ID3v1Genres = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal',
  'New Age', 'Oldies', 'Other', 'Pop', 'Rhythm and Blues', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial',
  'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal',
  'Jazz & Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel',
  'Noise', 'Alternative Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock',
  'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock',
  'Comedy', 'Cult', 'Gangsta', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native US', 'Cabaret', 'New Wave',
  'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro',
  'Musical', 'Rock ’n’ Roll', 'Hard Rock'];

enum ID3HeaderOffsets {
  MAGIC = 0,
  MAJOR_VERSION = MAGIC + 3,
  MINOR_VERSION = MAGIC + 4,
  FLAGS = MAGIC + 5,
  SIZE = MAGIC + 6,
  END_OF_HEADER = 10
}

enum ID3HeaderFlags {
  Unsynchronisation = 128, // 10000000
  Extended = 64,           // 01000000
  Experimental = 32,       // 00100000
  Footer = 16,             // 00010000
  Others = 15              // 00001111
}

enum ID3ExtendedHeaderOffsets {
  SIZE = 0,
  NUMBER_OF_FLAGS = SIZE + 4,
  FLAGS = SIZE + 5
  // END_OF_HEADER depends on NUMBER_OF_FLAGS
}

enum ID3FrameOffsets {
  ID = 0,
  SIZE = ID + 4,
  FLAGS = ID + 8,
  END_OF_HEADER = 10
}

enum ID3FrameFlags {
  Grouping = 64,          // 00000000 01000000
  Compression = 8,        // 00000000 00001000
  Encryption = 4,         // 00000000 00000100
  Unsynchronisation = 2,  // 00000000 00000010
  DataLengthIndicator = 1 // 00000000 00000001
}

const hasFlag = (flags: number, flag: number) => (flags & flag) === flag;
const unsyncedLength = (input: number) =>
  (input & 127) + ((input & (127 << 8)) >> 1) + ((input & (127 << 16)) >> 1) + ((input & (127 << 24)) >>> 1);

const isID3 = (buffer: Buffer) => buffer.slice(ID3HeaderOffsets.MAGIC, ID3HeaderOffsets.MAGIC + 3).toString() === 'ID3';
const isID3v24 = (buffer: Buffer) => buffer.readIntBE(ID3HeaderOffsets.MAJOR_VERSION, 1) <= 4;
const getID3HeaderFlags = (buffer: Buffer): HeaderFlags => {
  const flags = buffer.readIntBE(ID3HeaderOffsets.FLAGS, 1);
  return {
    unsynchronisation: hasFlag(flags, ID3HeaderFlags.Unsynchronisation),
    extendedHeader: hasFlag(flags, ID3HeaderFlags.Extended),
    experimental: hasFlag(flags, ID3HeaderFlags.Experimental),
    footer: hasFlag(flags, ID3HeaderFlags.Footer),
    others: (flags & ID3HeaderFlags.Others) !== 0
  };
};
const isPadding = (buffer: Buffer) => buffer.readUInt32BE(0) === 0;

const getID3FrameFlags = (buffer: Buffer) => {
  const flags = buffer.readInt16BE(ID3FrameOffsets.FLAGS);
  return {
    grouping: hasFlag(flags, ID3FrameFlags.Grouping),
    compression: hasFlag(flags, ID3FrameFlags.Compression),
    encryption: hasFlag(flags, ID3FrameFlags.Encryption),
    unsynchronisation: hasFlag(flags, ID3FrameFlags.Unsynchronisation),
    dataLengthIndicator: hasFlag(flags, ID3FrameFlags.DataLengthIndicator)
  };
};

// tslint:disable-next-line cyclomatic-complexity
const getFrameData = (buffer: Buffer) => {
  const name = buffer.slice(ID3FrameOffsets.ID, ID3FrameOffsets.ID + 4).toString();
  const length = unsyncedLength(buffer.readInt32BE(ID3FrameOffsets.SIZE));
  let encoding: string;
  switch (buffer.readInt8(ID3FrameOffsets.END_OF_HEADER)) {
    case 0:
      encoding = 'ISO-8859-1';
      break;
    case 1:
      encoding = 'UTF-16';
      break;
    case 2:
      encoding = 'UTF-16';
      break;
    case 3:
      encoding = 'UTF-8';
      break;
  }
  let data: any;
  switch (name) {
    case 'TXXX': {
        const idx = buffer.indexOf(0, ID3FrameOffsets.END_OF_HEADER + 1);
        const description = iconv.decode(buffer.slice(ID3FrameOffsets.END_OF_HEADER + 1, idx), encoding);
        data = {
          description,
          value: iconv.decode(buffer.slice(ID3FrameOffsets.END_OF_HEADER + 1 + description.length + 1,
            ID3FrameOffsets.END_OF_HEADER + length), encoding)
        };
      }
      break;
    case 'TPOS':
    case 'TLEN':
    case 'TYER':
    case 'TSSE':
    case 'TCON':
    case 'TRCK':
    case 'TALB':
    case 'TIT2':
    case 'TDRC':
    case 'TPE1':
    case 'TPE2':
      data =
        iconv.decode(buffer.slice(ID3FrameOffsets.END_OF_HEADER + 1, ID3FrameOffsets.END_OF_HEADER + length), encoding);
      break;
    case 'POPM': {
        const idx = buffer.indexOf(0, ID3FrameOffsets.END_OF_HEADER);
        const email = buffer.slice(ID3FrameOffsets.END_OF_HEADER, idx).toString();
        const rating = buffer.readUInt8(idx + 1);
        // TODO: counter
        data = {
          email,
          rating,
          counter: undefined
        };
      }
      break;
    case 'UFID': {
        const idx = buffer.indexOf(0, ID3FrameOffsets.END_OF_HEADER);
        const ownerIdentifier = buffer.slice(ID3FrameOffsets.END_OF_HEADER, idx).toString();
        data = {
          ownerIdentifier,
          identifier: buffer.slice(ID3FrameOffsets.END_OF_HEADER + ownerIdentifier.length, length)
        };
      }
      break;
  }
  return {
    name,
    length,
    flags: getID3FrameFlags(buffer),
    data
  };
};

interface HeaderFlags {
  unsynchronisation: boolean;
  extendedHeader: boolean;
  experimental: boolean;
  footer: boolean;
  others: boolean;
}

interface FrameData {
  name: string;
  length: number;
  flags: {
    grouping: boolean;
    compression: boolean;
    encryption: boolean;
    unsynchronisation: boolean;
    dataLengthIndicator: boolean;
  };
  data: any;
}

export class ID3v2 {

  private flags: HeaderFlags;

  private frames: {[name: string]: FrameData|FrameData[]} = {};

  // tslint:disable-next-line cyclomatic-complexity
  constructor(path: string) {
    const buffer = readFileSync(path);
    if (!isID3(buffer) || !isID3v24(buffer)) {
      return;
    }
    this.flags = getID3HeaderFlags(buffer);
    if (this.flags.others) {
      return;
    }
    const size = unsyncedLength(buffer.readInt32BE(ID3HeaderOffsets.SIZE));
    let startOfFrame = ID3HeaderOffsets.END_OF_HEADER;
    if (this.flags.extendedHeader) {
      const extendedHeaderBuffer = buffer.slice(ID3HeaderOffsets.END_OF_HEADER);
      const extendedHeaderSize = unsyncedLength(extendedHeaderBuffer.readInt32BE(ID3ExtendedHeaderOffsets.SIZE));
      startOfFrame += extendedHeaderSize;
    }

    while (startOfFrame < size) {
      const frameBuffer = buffer.slice(startOfFrame);
      if (isPadding(frameBuffer)) {
        break;
      }
      const frame = getFrameData(frameBuffer);
      if (this.frames[frame.name]) {
        if (!Array.isArray(this.frames[frame.name])) {
          this.frames[frame.name] = [this.frames[frame.name] as FrameData];
        }
        (this.frames[frame.name] as FrameData[]).push(frame);
      } else {
        this.frames[frame.name] = frame;
      }
      startOfFrame += ID3FrameOffsets.END_OF_HEADER + frame.length;
    }
  }

  private getFrameData(name: string): any {
    const frame = this.frames[name];
    if (Array.isArray(frame)) {
      return (frame as FrameData[]).map(entry => entry.data);
    }
    return frame ? (frame as FrameData).data : undefined;
  }

  get ufid(): {ownerIdentifier: string, identifier: Buffer} {
    return this.getFrameData('UFID');
  }

  get genre(): string {
    let genre = this.getFrameData('TCON') as string;
    if (genre) {
      const idx = parseInt(genre.replace(/[\(\)]/g, ''), 10);
      if (idx <= ID3v1Genres.length) {
        genre = ID3v1Genres[idx];
      }
    }
    return genre;
  }

  get track(): string {
    return this.getFrameData('TRCK');
  }

  get album(): string {
    return this.getFrameData('TALB');
  }

  get title(): string {
    return this.getFrameData('TIT2');
  }

  get year(): string {
    return this.getFrameData('TDRC') || this.getFrameData('TYER');
  }

  get artist(): string {
    return this.getFrameData('TPE1');
  }

  get popularimeter(): {email: string, rating: number, counter: number} {
    return this.getFrameData('POPM');
  }

  get length(): string {
    return this.getFrameData('TLEN');
  }

  get set(): string {
    return this.getFrameData('TPOS');
  }

  get text(): {description: string, value: string}|{description: string, value: string}[] {
    return this.getFrameData('TXXX');
  }

}
