/* 原创 8-bit 循环旋律：WebAudio 合成，默认关闭，无任何外部音频 */
(function () {
  'use strict';
  var PT = window.PT;

  var ctx = null;
  var master = null;
  var timer = null;
  var step = 0;
  var nextTime = 0;
  var playing = false;

  // C 大调五声音阶 + 温暖的低音，自己写的小镇主题
  var melody = [
    523.25, 0, 587.33, 659.25, 0, 783.99, 659.25, 0,
    587.33, 0, 523.25, 440.00, 0, 523.25, 587.33, 0,
    659.25, 0, 783.99, 880.00, 0, 783.99, 659.25, 0,
    587.33, 523.25, 440.00, 0, 392.00, 440.00, 523.25, 0
  ];
  var bass = [130.81, 110.00, 174.61, 196.00];
  var chords = [
    [261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63],
    [196.00, 246.94, 293.66]
  ];
  var stepDur = 0.235;

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      ctx = null;
      return false;
    }
  }

  function tone(freq, when, dur, type, volume) {
    if (!freq) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  function schedule() {
    if (!playing || !ctx) return;
    while (nextTime < ctx.currentTime + 0.16) {
      var i = step % melody.length;
      var when = nextTime;
      var m = melody[i];
      if (m) {
        tone(m, when, 0.19, 'square', 0.055);
        tone(m * 2, when + 0.012, 0.10, 'triangle', 0.016);
      }
      // 低音：四拍一换
      var b = Math.floor(i / 8) % bass.length;
      if (i % 4 === 0) tone(bass[b], when, 0.55, 'triangle', 0.085);
      if (i % 8 === 4) {
        var chord = chords[b];
        for (var c = 0; c < chord.length; c++) {
          tone(chord[c] * 2, when, 0.30, 'sine', 0.012);
        }
      }
      // 轻轻一下高音铃
      if (i % 8 === 6 && m) tone(m * 3, when, 0.34, 'sine', 0.018);
      nextTime += stepDur;
      step++;
    }
  }

  function start() {
    if (!ensure()) return false;
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    step = 0;
    nextTime = ctx.currentTime + 0.06;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5);
    if (timer) clearInterval(timer);
    timer = setInterval(schedule, 40);
    schedule();
    return true;
  }

  function stop() {
    if (!ctx) return;
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value || 0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  }

  PT.audio = {
    toggle: function () {
      if (playing) { stop(); return false; }
      return start();
    },
    isPlaying: function () { return playing; },
    stop: stop
  };
})();
