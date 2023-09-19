/* eslint-disable @typescript-eslint/no-empty-function */
import _ from 'lodash';
import { lampPutDpData, saveDiyScenes } from '../../../../api';
import DpCodes from '../../../../config/dpCodes';
import { nToHS, sToN } from '../../../../utils';
import { SCENE_ENTRY, scene_datas_life, scene_datas_weather, scene_datas_festival, scene_datas_diy } from './scene-config';
import { TYSdk } from 'tuya-panel-kit';

const { sceneCode: sceneValueCode, } = DpCodes;

/** 颜色结构体 */
export interface COLOR_DATA {
  isColour: boolean;
  h: number;
  s: number;
  t: number;
  b: number;
}

/** 场景数据结构体 */
export interface SCENE_DATA {
  version: number;
  id: number;             // 场景ID
  mode: number;           // 变化模式：0 静态，1 跳变，2 渐变，3 快闪， 4 呼吸， 5 慢闪
  mode2: number;          // 变化模式：0 静态，1 跳变，2 渐变，3 快闪， 4 呼吸， 5 慢闪
  type: number;           // 上下灯同步模式：0 上下灯同时变化，1 上下灯分别变化，2 单上灯变化，3 单下灯变化
  interval: number;       // 间隔时间
  time: number;           // 变化时间
  colors: COLOR_DATA[];   // 同时变化的颜色、分别变化时上灯的颜色、单灯的颜色
  colors2: COLOR_DATA[];  // 分别变化时下灯的颜色
  colors3: COLOR_DATA[];  // DIY场景下同步的颜色
}

export enum SCENE_TYPE {
  SYNC = 0,
  ASYNC,
  UP,
  DOWN,
  MAX,
};

/** 下发场景数据给到设备 */
export const lampSceneValue = (data: SCENE_DATA) => {
  const result = formatSceneValueForLamp(data);
  //TYSdk.native.simpleTipDialog('scene: ' + result, () => {})
  result.length > 0 && lampPutDpData({ [sceneValueCode] : result });
}

/** 格式化生成场景数据 */
export const formatSceneValueForLamp = (data: SCENE_DATA) => {
  const { id, mode, mode2, type, interval, time, colors, colors2, colors3 } = data;

  const t = type === SCENE_TYPE.UP ? SCENE_TYPE.DOWN
            : type === SCENE_TYPE.DOWN ? SCENE_TYPE.UP
            : type;

  let result = `${nToHS(id)}${nToHS(t)}`;

  const cs =  type === SCENE_TYPE.SYNC ? colors3
            : type === SCENE_TYPE.ASYNC ? colors2
            : type === SCENE_TYPE.DOWN ? colors2
            : colors;

  if (!cs || cs.length <= 0) {
    return '';
  }

  /** 第一个灯的颜色 */
  result += `${nToHS(interval)}${nToHS(time)}${nToHS(mode)}${nToHS(cs.length)}`;
  result += cs.reduce((total: string, {isColour, h, s, t, b}: COLOR_DATA) => {
    if (isColour) {
      return total + `01${nToHS(h, 4)}${nToHS(s, 4)}${nToHS(b, 4)}`;
    } else {
      return total + `00${nToHS(b, 4)}${nToHS(t, 4)}`;
    }
  }, '');

  /** 第二个灯的颜色 */
  if (type === SCENE_TYPE.ASYNC) {
    result += `${nToHS(interval)}${nToHS(time)}${nToHS(mode2)}${nToHS(colors.length)}`;
    result += colors.reduce((total: string, {isColour, h, s, t, b}: COLOR_DATA) => {
      if (isColour) {
        return total + `01${nToHS(h, 4)}${nToHS(s, 4)}${nToHS(b, 4)}`;
      } else {
        return total + `00${nToHS(b, 4)}${nToHS(t, 4)}`;
      }
    }, '');
  }
  return result;
}

/** 解析场景数据，得到场景结构体 */
export const parseSceneValue = (str: string) => {
  if (!str || typeof str !== 'string' || str.length <= 22) {
    return;
  }

  const id = sToN(str.slice(0, 2));
  const t = sToN(str.slice(2, 4));
  const type = t === SCENE_TYPE.UP ? SCENE_TYPE.DOWN
              : t === SCENE_TYPE.DOWN ? SCENE_TYPE.UP
              : t;

  let time = sToN(str.slice(4, 6));
  let interval = sToN(str.slice(6, 8));
  let mode = sToN(str.slice(8, 10));
  let mode2 = mode;
  const colors: COLOR_DATA[] = [];
  const colors2: COLOR_DATA[] = [];
  const colors3: COLOR_DATA[] = [];

  let colorCnt = sToN(str.slice(10, 12));
  let offset = 12;
  _.times(colorCnt, _i => {
    const isColour = sToN(str.slice(offset, offset + 2)) === 0 ? false : true;
    if (isColour) {
      const h = sToN(str.slice(offset + 2, offset + 6));
      const s = sToN(str.slice(offset + 6, offset + 10));
      const b = sToN(str.slice(offset + 10, offset + 14));
      colors.push({isColour, h, s, b, t: 0});
      offset += 14;
    } else {
      const b = sToN(str.slice(offset + 2, offset + 6));
      const t = sToN(str.slice(offset + 6, offset + 10));
      colors.push({isColour, h: 0, s: 0, b, t});
      offset += 10;
    }
  });

  if (type === SCENE_TYPE.ASYNC) {
    mode2 = sToN(str.slice(offset + 4, offset + 6));
    let colorCnt2 = sToN(str.slice(offset + 6, offset + 8));
    offset += 8;
    _.times(colorCnt2, _i => {
      const isColour = sToN(str.slice(offset, offset + 2)) === 0 ? false : true;
      if (isColour) {
        const h = sToN(str.slice(offset + 2, offset + 6));
        const s = sToN(str.slice(offset + 6, offset + 10));
        const b = sToN(str.slice(offset + 10, offset + 14));
        colors2.push({isColour, h, s, b, t: 0});
        offset += 14;
      } else {
        const b = sToN(str.slice(offset + 2, offset + 6));
        const t = sToN(str.slice(offset + 6, offset + 10));
        colors2.push({isColour, h: 0, s: 0, b, t});
        offset += 10;
      }
    });
  }

  return {
    version: 0,
    id,
    mode,
    mode2,
    type,
    interval,
    time,
    colors: type === SCENE_TYPE.ASYNC ? colors2 : colors,
    colors2: type === SCENE_TYPE.ASYNC ? colors : colors2,
    colors3,
  };
}

const checSceneValue = (v) => {
  if (!v || typeof v === 'string') {
    return false;
  }

  return true;
}

/** 从云端数据中解析得到DIY场景数据 */
export const parseCloudDiyScenes = (diyScenes) => {
  const cnt = scene_datas_diy.length;
  const res = _.times(cnt, i => {
    if (i < diyScenes.length) {
      const v = diyScenes[i].value; //parseSceneValue(diyScenes[i].value);
      return {
        image: scene_datas_diy[i].image,
        title: diyScenes.title || scene_datas_diy[i].title,
        value: checSceneValue(v) ? v : scene_datas_diy[i].value,
      }
    } else {
      return scene_datas_diy[i];
    }
  });

  return res;
}

/** 保存Diy场景数据到云端 */
export const saveCloudDiyScene = (diyScenes: SCENE_ENTRY[]) => {
  const res = diyScenes.map(d => {
    return {
      title: d.title,
      value: d.value, //formatSceneValue(d.value),
    }
  });
  saveDiyScenes(res)
}

/** 通过场景数据解析出场景ID */
export const getSceneValueId = (str: string) => {
  const v = parseSceneValue(str);
  return v ? v.id : -1;
}

/** 各标签页的数据集 */
export const tabDatas = [
  { key: 'life',     title: 'Life', datas: scene_datas_life },
  { key: 'nature',  title: 'Nature', datas: scene_datas_weather },
  { key: 'celebrations', title: 'Celebrations', datas: scene_datas_festival },
  { key: 'diy',      title: 'DIY', datas: scene_datas_diy },
];

/** 通过标签页名称获取标签页数据 */
export const getSceneDatasByTab = (tab: string) => {
  const res = tabDatas.filter(t => t.key === tab);
  if (res && res.length > 0) {
    return res[0];
  }
  return tabDatas[0];
}

/** 根据场景ID搜索确认属于哪个标签页 */
export const getSceneTabKeyById = (id: number) => {
  let tab = tabDatas[0].key;

  tabDatas.map(t => {
    const r = t.datas.filter(d => d.value.id === id);
    if (r && r.length > 0) {
      tab = t.key;
    }
  });

  return tab;
}
