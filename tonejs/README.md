トップダウン設計で考える
- 音楽教育サイトで使用する
  - 自動再生
    - ボタンを押したら楽典の譜例の音がなる
    - 聴音再生
      - プレイリストで再生
      - 小節を指定して再生
      - 音量を調整する（ミュート含む、一部の声部の音量変更）
      - 移調？（これはVerovioで移調譜面と一緒に移調されたMIDIを作成する方が都合がよいか）
      - テンポ変更
      - 同時再生（複旋律聴音や和声聴音など）
    - Verovioで作成したMIDIを演奏（楽譜と同期させる）
  - ユーザー演奏
    - キーボードで音をならす（ただし楽典や聴音で参考の音をだしてみたい程度）
    - っていうか、キーボードコンポーネントが欲しい。
    - 


どんな機能が必要そう？
- ファイルをロードする
- MIDIから鳴らす
- MIDIをデコードしてから鳴らす（変換する）
- JSオブジェクトから鳴らす

- 再生速度変更（今回再生速度変更は聴音がメインなので、Verovioでテンポ変更したMIDIを作り直しちゃうという方法もあるか？）いや、audio-player-base.jsにsetTempo()/getTempo()メソッドを実装し、Tone.Transport.bpm.valueを操作するか。

- Vervovioで作り直しかな
  - 臨時記号を外して再生（参考楽譜も欲しいのでは？）
  - 移調して再生（移調譜も欲しいのでは？）
---


Low-Level API
tonejs/
- loader.js
  - Tone.jsをロードして使える状態にする（Tone.start()
- midi-parser.js
  - あらゆるものからTone.jsで使える状態にする
  - @tonejs/midiのロードとかも
- synthesizer.js
  - シンセサイザー音源の管理
- sampleer.js
  - サンプリング音源の管理
- instruments.js
  - synthesizer.jsとsampleer.jsを使って、楽器の設定とか
- volume.js
- audio-player-base.js
  - play(), pause(), stop(), setTempo(), getTempo()
    
再生速度の変更？

High-Level API
tonejs/
- user-keyboard.js (extends AudioPlayerBase)
  - 
- chord-player.js (extends AudioPlayerBase)
  - 主和音や和音の解説などで、さっと和音を鳴らせる
- dictation-player.js (extends AudioPlayerBase)
  - 聴音音源の再生に特化した機能を備えている
  - 小節指定再生ロジック: MIDIデータの小節情報を基にTone.Partの再生範囲を制御する内部ロジック。
  - 声部ごとの音量/ミュート制御: midi-parser.jsから得たトラック情報とvolume.jsを利用し、各声部に対応するTone.Gainノードを管理・操作する機能。
  - 
- bell-player.js (extends AudioPlayerBase)
- dictation-playlist-player.js
