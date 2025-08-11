// tonejs/processor/core-processor.js
import { loadToneJsMidi } from './tonejs-midi-loader.js';
import { initTempo } from '../core/tempo.js';

/**
 * Verovio 由来の MIDI データ（ArrayBuffer など）を解析し、
 * @tonejs/midi の Midi インスタンスと timeSignature 情報を返します。
 * また、先頭テンポを Tone.Transport に反映します（テンポ変化は未対応）。
 *
 * @param {ArrayBuffer|string|Uint8Array} midiData
 * @returns {Promise<{midi:any, timeSignature:{beatsPerMeasure:number, subdivision:number}}>}
 */
export async function processMidiData(midiData) {
  try {
    const Midi = await loadToneJsMidi();
    const midi = new Midi(midiData);

    // 先頭テンポ
    if (midi.header?.tempos?.length) {
      const firstTempo = midi.header.tempos[0].bpm;
      initTempo(firstTempo);
      console.log(`[core-processor] MIDIからBPMを検出しました: ${firstTempo}`);
    } else {
      initTempo(120);
      console.warn('[core-processor] MIDIにテンポ情報なし。120BPMを使用。');
    }

    // 拍子
    let timeSignature = { beatsPerMeasure: 4, subdivision: 4 };
    if (midi.header?.timeSignatures?.length) {
      const ts = midi.header.timeSignatures[0].timeSignature;
      timeSignature = { beatsPerMeasure: ts[0], subdivision: ts[1] };
      console.log(
        `[core-processor] MIDIから拍子記号を検出しました: ${timeSignature.beatsPerMeasure}/${timeSignature.subdivision}`
      );
    } else {
      console.warn('[core-processor] MIDIに拍子記号なし。4/4を使用。');
    }

    return { midi, timeSignature };
  } catch (e) {
    console.error('[core-processor] MIDI解析に失敗:', e);
    throw e;
  }
}
