// GENERADO por scripts/import-qet.ts — no editar a mano.
// Símbolos normalizados de EN 60617 convertidos desde la colección de elementos
// de QElectroTech (licencia CC-BY 3.0, ver NOTICE-qet.md), muestreados a
// polilíneas en coordenadas 0..1 para poder escalarlos a la caja del registro.

export interface QetShape {
  pts: [number, number][];
  closed: boolean;
  fill: boolean;
  thin: boolean;
}

export interface QetPin {
  name: string;
  nx: number;
  ny: number;
  side: 'left' | 'right' | 'top' | 'bottom';
}

export interface QetSymbol {
  source: string;
  size: { w: number; h: number };
  pins: QetPin[];
  shapes: QetShape[];
}

export const QET_SYMBOLS: Record<number, QetSymbol> = {
  1050: {
    source: "10_electric/91_en_60617/en_60617_05/en_60617_05_06/en_60617_05_06_01.elmt",
    size: { w: 14, h: 24 },
    pins: [{"name":"1","nx":0.833,"ny":0,"side":"top"},{"name":"2","nx":0.833,"ny":1,"side":"bottom"}],
    shapes: [
      { pts: [[0.833,0.8],[0.833,1]], closed: false, fill: false, thin: false },
      { pts: [[0.833,0],[0.833,0.2]], closed: false, fill: false, thin: false },
      { pts: [[0.167,0.2],[0.5,0.4]], closed: false, fill: false, thin: false },
      { pts: [[0,0.3],[0.333,0.5]], closed: false, fill: false, thin: false },
      { pts: [[0.667,0.2],[1,0.2],[1,0.8],[0.667,0.8]], closed: true, fill: false, thin: false },
    ],
  },
  1051: {
    source: "10_electric/91_en_60617/en_60617_05/en_60617_05_06/en_60617_05_06_02.elmt",
    size: { w: 19, h: 24 },
    pins: [{"name":"1","nx":0.75,"ny":0,"side":"top"},{"name":"2","nx":0.75,"ny":1,"side":"bottom"}],
    shapes: [
      { pts: [[0.75,0],[0.75,1]], closed: false, fill: false, thin: false },
      { pts: [[0.125,0.3],[0.375,0.5]], closed: false, fill: false, thin: false },
      { pts: [[0,0.4],[0.25,0.6]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.8],[1,0.8]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.4],[1,0.4],[0.75,0.8]], closed: true, fill: false, thin: false },
    ],
  },
  3012: {
    source: "10_electric/91_en_60617/en_60617_06/en_60617_06_10/en_60617_06_10_03.elmt",
    size: { w: 12, h: 24 },
    pins: [{"name":"1","nx":0.375,"ny":1,"side":"bottom"},{"name":"2","nx":0.375,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0.375,0],[0.375,0.188]], closed: false, fill: false, thin: false },
      { pts: [[0.375,0.813],[0.375,1]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.125],[0.5,0.063]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.094],[0.5,0.031]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.938],[0.5,0.875]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.969],[0.5,0.906]], closed: false, fill: false, thin: false },
      { pts: [[0.375,0.438],[0.375,0.375]], closed: false, fill: false, thin: false },
      { pts: [[0.375,0.375],[1,0.375]], closed: false, fill: false, thin: false },
      { pts: [[0.75,0.375],[0.737,0.326],[0.7,0.281],[0.64,0.242],[0.563,0.213],[0.472,0.194],[0.375,0.188],[0.278,0.194],[0.188,0.213],[0.11,0.242],[0.05,0.281],[0.013,0.326],[0,0.375],[0.013,0.424],[0.05,0.469],[0.11,0.508],[0.187,0.537],[0.278,0.556],[0.375,0.563],[0.472,0.556],[0.563,0.537],[0.64,0.508],[0.7,0.469],[0.737,0.424],[0.75,0.375]], closed: true, fill: false, thin: false },
      { pts: [[0.75,0.625],[0.737,0.576],[0.7,0.531],[0.64,0.492],[0.563,0.463],[0.472,0.444],[0.375,0.438],[0.278,0.444],[0.188,0.463],[0.11,0.492],[0.05,0.531],[0.013,0.576],[0,0.625],[0.013,0.674],[0.05,0.719],[0.11,0.758],[0.187,0.787],[0.278,0.806],[0.375,0.813],[0.472,0.806],[0.563,0.787],[0.64,0.758],[0.7,0.719],[0.737,0.674],[0.75,0.625]], closed: true, fill: false, thin: false },
    ],
  },
  3013: {
    source: "10_electric/91_en_60617/en_60617_06/en_60617_06_14/en_60617_06_14_03.elmt",
    size: { w: 24, h: 24 },
    pins: [],
    shapes: [
      { pts: [[0,1],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.8],[0.9,0.8]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.9],[0.65,0.9]], closed: false, fill: false, thin: false },
      { pts: [[0.75,0.9],[0.9,0.9]], closed: false, fill: false, thin: false },
      { pts: [[0,0],[1,0],[1,1],[0,1]], closed: true, fill: false, thin: false },
      { pts: [[0.375,0.25],[0.374,0.242],[0.371,0.234],[0.365,0.226],[0.358,0.219],[0.349,0.212],[0.338,0.206],[0.326,0.2],[0.313,0.196],[0.298,0.192],[0.282,0.19],[0.266,0.188],[0.25,0.188],[0.234,0.188],[0.218,0.19],[0.202,0.192],[0.188,0.196],[0.174,0.2],[0.162,0.206],[0.151,0.212],[0.142,0.219],[0.135,0.226],[0.129,0.234],[0.126,0.242],[0.125,0.25]], closed: false, fill: false, thin: false },
      { pts: [[0.375,0.25],[0.376,0.258],[0.379,0.266],[0.385,0.274],[0.392,0.281],[0.401,0.288],[0.412,0.294],[0.424,0.3],[0.437,0.304],[0.452,0.308],[0.468,0.31],[0.484,0.312],[0.5,0.313],[0.516,0.312],[0.532,0.31],[0.548,0.308],[0.563,0.304],[0.576,0.3],[0.588,0.294],[0.599,0.288],[0.608,0.281],[0.615,0.274],[0.621,0.266],[0.624,0.258],[0.625,0.25]], closed: false, fill: false, thin: false },
    ],
  },
  5000: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_21/en_60617_07_21_02.elmt",
    size: { w: 6, h: 24 },
    pins: [{"name":"1","nx":0.5,"ny":0,"side":"top"},{"name":"2","nx":0.5,"ny":1,"side":"bottom"}],
    shapes: [
      { pts: [[0.5,0],[0.5,1]], closed: false, fill: false, thin: false },
      { pts: [[0,0.25],[1,0.25],[1,0.75],[0,0.75]], closed: true, fill: false, thin: false },
      { pts: [[0,0.25],[1,0.25],[1,0.333],[0,0.333]], closed: true, fill: true, thin: false },
    ],
  },
  9010: {
    source: "10_electric/91_en_60617/en_60617_08/en_60617_08_10/en_60617_08_10_06.elmt",
    size: { w: 24, h: 24 },
    pins: [{"name":"1","nx":0.25,"ny":1,"side":"bottom"},{"name":"2","nx":0.75,"ny":1,"side":"bottom"}],
    shapes: [
      { pts: [[0,0.5],[1,0.5]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.5],[0.25,1]], closed: false, fill: false, thin: false },
      { pts: [[0.75,0.5],[0.75,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.5],[0.996,0.435],[0.983,0.371],[0.962,0.309],[0.933,0.25],[0.897,0.196],[0.854,0.146],[0.804,0.103],[0.75,0.067],[0.691,0.038],[0.629,0.017],[0.565,0.004],[0.5,0],[0.435,0.004],[0.371,0.017],[0.309,0.038],[0.25,0.067],[0.196,0.103],[0.146,0.146],[0.103,0.196],[0.067,0.25],[0.038,0.309],[0.017,0.371],[0.004,0.435],[0,0.5]], closed: false, fill: false, thin: false },
    ],
  },
  9012: {
    source: "10_electric/91_en_60617/en_60617_08/en_60617_08_10/en_60617_08_10_09.elmt",
    size: { w: 19, h: 24 },
    pins: [{"name":"1","nx":0.25,"ny":1,"side":"bottom"},{"name":"2","nx":0.75,"ny":1,"side":"bottom"}],
    shapes: [
      { pts: [[0.25,0.6],[0.25,1]], closed: false, fill: false, thin: false },
      { pts: [[0.75,0.6],[0.75,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.6],[0,0.6],[0.5,0]], closed: true, fill: false, thin: false },
    ],
  },
  9011: {
    source: "10_electric/91_en_60617/en_60617_08/en_60617_08_10/en_60617_08_10_10.elmt",
    size: { w: 24, h: 24 },
    pins: [{"name":"1","nx":0.25,"ny":1,"side":"bottom"},{"name":"2","nx":0.75,"ny":1,"side":"bottom"}],
    shapes: [
      { pts: [[0,0],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.45],[0.25,1]], closed: false, fill: false, thin: false },
      { pts: [[0.75,0.45],[0.75,1]], closed: false, fill: false, thin: false },
      { pts: [[0,0],[0.004,0.065],[0.017,0.129],[0.038,0.191],[0.067,0.25],[0.103,0.304],[0.146,0.354],[0.196,0.397],[0.25,0.433],[0.309,0.462],[0.371,0.483],[0.435,0.496],[0.5,0.5],[0.565,0.496],[0.629,0.483],[0.691,0.462],[0.75,0.433],[0.804,0.397],[0.854,0.354],[0.897,0.304],[0.933,0.25],[0.962,0.191],[0.983,0.129],[0.996,0.065],[1,0]], closed: false, fill: false, thin: false },
    ],
  },
  9004: {
    source: "10_electric/91_en_60617/en_60617_11/en_60617_11_14/en_60617_11_14_13.elmt",
    size: { w: 24, h: 12 },
    pins: [],
    shapes: [
      { pts: [[0,0],[1,0],[1,1],[0,1]], closed: true, fill: false, thin: false },
    ],
  },
  1004: {
    source: "10_electric/91_en_60617/en_60617_06/en_60617_06_08/en_60617_06_08_03.elmt",
    size: { w: 16, h: 24 },
    pins: [{"name":"1","nx":0.25,"ny":0,"side":"top"},{"name":"2","nx":0.25,"ny":1,"side":"bottom"},{"name":"3","nx":0.75,"ny":1,"side":"bottom"},{"name":"4","nx":0.5,"ny":1,"side":"bottom"},{"name":"5","nx":0.75,"ny":0,"side":"top"},{"name":"6","nx":0.5,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0.5,0],[0.5,0.167]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0],[0.25,0.208]], closed: false, fill: false, thin: false },
      { pts: [[0.75,0],[0.75,0.208]], closed: false, fill: false, thin: false },
      { pts: [[0.5,1],[0.5,0.75]], closed: false, fill: false, thin: false },
      { pts: [[0.25,1],[0.25,0.692]], closed: false, fill: false, thin: false },
      { pts: [[0.75,1],[0.75,0.692]], closed: false, fill: false, thin: false },
      { pts: [[0.875,0.5],[0.862,0.435],[0.825,0.375],[0.765,0.323],[0.688,0.283],[0.597,0.259],[0.5,0.25],[0.403,0.259],[0.313,0.283],[0.235,0.323],[0.175,0.375],[0.138,0.435],[0.125,0.5],[0.138,0.565],[0.175,0.625],[0.235,0.677],[0.312,0.717],[0.403,0.741],[0.5,0.75],[0.597,0.741],[0.688,0.717],[0.765,0.677],[0.825,0.625],[0.862,0.565],[0.875,0.5]], closed: true, fill: false, thin: false },
      { pts: [[1,0.5],[0.983,0.414],[0.933,0.333],[0.854,0.264],[0.75,0.211],[0.629,0.178],[0.5,0.167],[0.371,0.178],[0.25,0.211],[0.146,0.264],[0.067,0.333],[0.017,0.414],[0,0.5],[0.017,0.586],[0.067,0.667],[0.146,0.736],[0.25,0.789],[0.371,0.822],[0.5,0.833],[0.629,0.822],[0.75,0.789],[0.854,0.736],[0.933,0.667],[0.983,0.586],[1,0.5]], closed: true, fill: false, thin: false },
      { pts: [[0.563,0.583],[0.562,0.581],[0.56,0.578],[0.558,0.575],[0.554,0.573],[0.55,0.571],[0.544,0.569],[0.538,0.567],[0.531,0.565],[0.524,0.564],[0.516,0.563],[0.508,0.563],[0.5,0.563],[0.492,0.563],[0.484,0.563],[0.476,0.564],[0.469,0.565],[0.462,0.567],[0.456,0.569],[0.45,0.571],[0.446,0.573],[0.442,0.575],[0.44,0.578],[0.438,0.581],[0.438,0.583]], closed: false, fill: false, thin: false },
      { pts: [[0.563,0.583],[0.563,0.586],[0.565,0.589],[0.567,0.591],[0.571,0.594],[0.575,0.596],[0.581,0.598],[0.587,0.6],[0.594,0.601],[0.601,0.603],[0.609,0.603],[0.617,0.604],[0.625,0.604],[0.633,0.604],[0.641,0.603],[0.649,0.603],[0.656,0.601],[0.663,0.6],[0.669,0.598],[0.675,0.596],[0.679,0.594],[0.683,0.591],[0.685,0.589],[0.687,0.586],[0.688,0.583]], closed: false, fill: false, thin: false },
    ],
  },
  8004: {
    source: "10_electric/91_en_60617/en_60617_11/en_60617_11_14/en_60617_11_14_12.elmt",
    size: { w: 15, h: 24 },
    pins: [],
    shapes: [
      { pts: [[0.8,0.5],[0.786,0.435],[0.746,0.375],[0.683,0.323],[0.6,0.283],[0.504,0.259],[0.4,0.25],[0.296,0.259],[0.2,0.283],[0.117,0.323],[0.054,0.375],[0.014,0.435],[0,0.5],[0.014,0.565],[0.054,0.625],[0.117,0.677],[0.2,0.717],[0.296,0.741],[0.4,0.75],[0.504,0.741],[0.6,0.717],[0.683,0.677],[0.746,0.625],[0.786,0.565],[0.8,0.5]], closed: true, fill: false, thin: false },
      { pts: [[0.6,0.5],[0.593,0.468],[0.573,0.438],[0.541,0.412],[0.5,0.392],[0.452,0.379],[0.4,0.375],[0.348,0.379],[0.3,0.392],[0.259,0.412],[0.227,0.438],[0.207,0.468],[0.2,0.5],[0.207,0.532],[0.227,0.563],[0.259,0.588],[0.3,0.608],[0.348,0.621],[0.4,0.625],[0.452,0.621],[0.5,0.608],[0.541,0.588],[0.573,0.563],[0.593,0.532],[0.6,0.5]], closed: true, fill: false, thin: false },
      { pts: [[0.6,0],[0.6,0.125],[1,0.125],[1,0.875],[0.6,0.875],[0.6,1]], closed: false, fill: false, thin: false },
    ],
  },
  2006: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_13/en_60617_07_13_02.elmt",
    size: { w: 6, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0,0.283]], closed: false, fill: false, thin: false },
      { pts: [[1,0.258],[0.959,0.259],[0.919,0.26],[0.88,0.262],[0.844,0.264],[0.81,0.267],[0.779,0.271],[0.752,0.275],[0.729,0.279],[0.711,0.284],[0.698,0.289],[0.69,0.295],[0.688,0.3],[0.69,0.305],[0.698,0.311],[0.711,0.316],[0.729,0.321],[0.752,0.325],[0.779,0.329],[0.81,0.333],[0.844,0.336],[0.88,0.338],[0.919,0.34],[0.959,0.341],[1,0.342]], closed: false, fill: false, thin: false },
    ],
  },
  6010: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_13/en_60617_07_13_05.elmt",
    size: { w: 6, h: 24 },
    pins: [{"name":"1","nx":0.8,"ny":1,"side":"bottom"},{"name":"2","nx":0.8,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0.8,0.333],[0.8,0]], closed: false, fill: false, thin: false },
      { pts: [[0.8,0.667],[0.8,1]], closed: false, fill: false, thin: false },
      { pts: [[0.8,0.667],[0,0.283]], closed: false, fill: false, thin: false },
      { pts: [[0.6,0.3],[1,0.367]], closed: false, fill: false, thin: false },
      { pts: [[1,0.3],[0.6,0.367]], closed: false, fill: false, thin: false },
    ],
  },
  6017: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_13/en_60617_07_13_03.elmt",
    size: { w: 6, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0,0.283]], closed: false, fill: false, thin: false },
      { pts: [[1,0.258],[0.959,0.259],[0.919,0.26],[0.88,0.262],[0.844,0.264],[0.81,0.267],[0.779,0.271],[0.752,0.275],[0.729,0.279],[0.711,0.284],[0.698,0.289],[0.69,0.295],[0.688,0.3],[0.69,0.305],[0.698,0.311],[0.711,0.316],[0.729,0.321],[0.752,0.325],[0.779,0.329],[0.81,0.333],[0.844,0.336],[0.88,0.338],[0.919,0.34],[0.959,0.341],[1,0.342]], closed: false, fill: false, thin: false },
      { pts: [[0.25,0.383],[0,0.4],[0.125,0.45],[0.375,0.433]], closed: true, fill: true, thin: false },
    ],
  },
  6019: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_07/en_60617_07_07_01.elmt",
    size: { w: 14, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0,0.5],[0.886,0.5]], closed: false, fill: false, thin: false },
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0,0.583]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0.771,0.283]], closed: false, fill: false, thin: false },
    ],
  },
  6020: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_07/en_60617_07_07_01.elmt",
    size: { w: 14, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0,0.5],[0.886,0.5]], closed: false, fill: false, thin: false },
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0,0.583]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0.771,0.283]], closed: false, fill: false, thin: false },
    ],
  },
  9000: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_15/en_60617_07_15_01.elmt",
    size: { w: 24, h: 24 },
    pins: [{"name":"1","nx":0.5,"ny":1,"side":"bottom"},{"name":"2","nx":0.5,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0.5,0],[0.5,0.25]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.75],[0.5,1]], closed: false, fill: false, thin: false },
      { pts: [[0,0.25],[1,0.25],[1,0.75],[0,0.75]], closed: true, fill: false, thin: false },
    ],
  },
  7016: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_15/en_60617_07_15_01.elmt",
    size: { w: 24, h: 24 },
    pins: [{"name":"1","nx":0.5,"ny":1,"side":"bottom"},{"name":"2","nx":0.5,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0.5,0],[0.5,0.25]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.75],[0.5,1]], closed: false, fill: false, thin: false },
      { pts: [[0,0.25],[1,0.25],[1,0.75],[0,0.75]], closed: true, fill: false, thin: false },
    ],
  },
  7018: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_15/en_60617_07_15_01.elmt",
    size: { w: 24, h: 24 },
    pins: [{"name":"1","nx":0.5,"ny":1,"side":"bottom"},{"name":"2","nx":0.5,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0.5,0],[0.5,0.25]], closed: false, fill: false, thin: false },
      { pts: [[0.5,0.75],[0.5,1]], closed: false, fill: false, thin: false },
      { pts: [[0,0.25],[1,0.25],[1,0.75],[0,0.75]], closed: true, fill: false, thin: false },
    ],
  },
  8000: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_07/en_60617_07_07_02.elmt",
    size: { w: 14, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0,0.5],[0.886,0.5]], closed: false, fill: false, thin: false },
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0,0.583]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0.771,0.283]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0.143,0.417]], closed: false, fill: false, thin: false },
      { pts: [[0.143,0.583],[0,0.583]], closed: false, fill: false, thin: false },
    ],
  },
  8100: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_07/en_60617_07_07_02.elmt",
    size: { w: 14, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0,0.5],[0.886,0.5]], closed: false, fill: false, thin: false },
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0,0.583]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0.771,0.283]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0.143,0.417]], closed: false, fill: false, thin: false },
      { pts: [[0.143,0.583],[0,0.583]], closed: false, fill: false, thin: false },
    ],
  },
  8008: {
    source: "10_electric/91_en_60617/en_60617_07/en_60617_07_07/en_60617_07_07_01.elmt",
    size: { w: 14, h: 24 },
    pins: [{"name":"1","nx":1,"ny":1,"side":"bottom"},{"name":"2","nx":1,"ny":0,"side":"top"}],
    shapes: [
      { pts: [[0,0.5],[0.886,0.5]], closed: false, fill: false, thin: false },
      { pts: [[1,0.333],[1,0]], closed: false, fill: false, thin: false },
      { pts: [[0,0.417],[0,0.583]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[1,1]], closed: false, fill: false, thin: false },
      { pts: [[1,0.667],[0.771,0.283]], closed: false, fill: false, thin: false },
    ],
  },
};
