import {
  translateTimeToS,
  LOCAL_TIMING_MODE_ADD,
  LOCAL_TIMING_MODE_DEL,
  LOCAL_TIMING_MODE_MOD,
  LocalGroupTimingData,
  parseLocalGroupTimingData,
  formatLocalGroupTimingData,
  formatLocalTimingListData,
  LocalSingleTimingData,
  parseLocalSingleTimingData,
  formatLocalSingleTimingData,
  formatLocalSingleTimingListData,
} from '../../../../utils';
import { lampPutDpData } from '../../../../api';
import DpCodes from '../../../../config/dpCodes';
import _ from 'lodash';
import { TYSdk } from 'tuya-panel-kit';

const { localTimingModifyCode, localTimingListCode, localSingleTimingModifyCode, localSingleTimingListCode } = DpCodes;
export const SINGLE_TIMER_CNT_MAX = 2;
export const GROUP_TIMER_CNT_MAX = 8;
export const TIMER_CATEGORY = 'category_timer';//'time_clock'
export const SINGLE_TIMER_ALIAS_BNAME = 'single';//'time_clock'

let group_timers: LocalGroupTimingData[] = []; // 从云端读取到本地缓存的定时规则
let single_timers: LocalSingleTimingData[] = []; // 从云端读取到本地缓存的定时规则

export enum TimerType {
  SINGLE = 0,
  GROUP,
};

export interface ConflitEntry {
  index: number;
  type: number;
};

interface TimeStage {
  startTime: number;
  endTime: number;
  loops: string;
}

/* 将字符串的时间转换成当天的分钟数 */
const translateTimeToN = (time: string) => {
  const t = time.split(':');
  return parseInt(t[0]) * 60 + parseInt(t[1]);
};

const translateLoopsToNext = (loops: string) => {
  const n = loops.split('');
  const m = n.pop();
  n.unshift(m ? m : '0');
  return n.join('');
};

const checkLoopsCross = (l1: string, l2: string) => {
  const n1 = l1.split('');
  const n2 = l2.split('');
  return n1.map(
                  (i, index) => (i === '1' && n2[index] === '1')
                ).includes(true);
};

/* 检查时间是否与已经存在并开启的定时任务存在冲突 */
export const checkGroupTimerConflit = (startTime: string, endTime: string, loops: string, index: number) => {
  const loopsStart = translateLoops(loops, startTime, true);
  const loopsEnd = translateTimeToN(endTime) > translateTimeToN(startTime) ? loopsStart : translateLoopsToNext(loopsStart);
  let res: ConflitEntry[] = [];

  /** 判断定时组是否存在时间段的交叉 */
  group_timers.map( (item, i) => {
    if (index === i || (!item.state)) {
      return false;
    }

    /* 如果起始的定时已经执行过了，则将起始时间判定为当前时间 */
    const s = (item.loops === '0000000' && item.execuing) ? genCurrentTimeStr() : item.startTime;
    const itemLoopsStart =  translateLoops(item.loops, item.startTime, !item.execuing);
    //TYSdk.native.simpleTipDialog('confilt: ' + loopsStart + ' ** ' + itemLoopsStart, () => {});

    if (checkTimeConflit(startTime, endTime, loopsStart, s, item.endTime, itemLoopsStart)) {
      res.push({ index: i, type: TimerType.GROUP });
    }
  });

  /** 判断单项定时是否存在时间点的相同 */
  single_timers.map( (item, i) => {
    if (!item.state || (item.time !== startTime && item.time !== endTime)) {
      return false;
    }

    /** 当前定时的执行日期 */
    const iLoops =  translateLoops(item.loops, item.time, true);
    const tLoops = item.time === startTime ? loopsStart : loopsEnd;

    if (checkLoopsCross(iLoops, tLoops)) {
      res.push({ index: i, type: TimerType.SINGLE });
    }
  });
  return res;
};

/* 检查时间是否与已经存在并开启的定时任务存在冲突 */
export const checkSingleTimerConflit = (time: string, loops: string, index: number) => {
  const loopsStart = translateLoops(loops, time, true);
  let res: ConflitEntry[] = [];

  /** 判断定时组是否存在时间段的交叉 */
  group_timers.map( (item, i) => {
    if (!item.state || (item.startTime !== time && item.endTime !== time)) {
      return false;
    }

    const itemLoopsStart =  translateLoops(item.loops, item.startTime, !item.execuing);
    const itemLoopsEnd =  translateTimeToN(item.endTime) > translateTimeToN(item.startTime) ? itemLoopsStart : translateLoopsToNext(itemLoopsStart);
    const iLoops = item.startTime === time ? itemLoopsStart : itemLoopsEnd;

    if (checkLoopsCross(loopsStart, iLoops)) {
      res.push({ index: i, type: TimerType.GROUP });
    }
  });

  /** 判断单项定时是否存在时间点的相同 */
  single_timers.map( (item, i) => {
    if (index === i || !item.state || item.time !== time) {
      return false;
    }

    /** 当前定时的执行日期 */
    const iLoops =  translateLoops(item.loops, item.time, true);
    //TYSdk.native.simpleTipDialog('sc: ' + iLoops + '; ' + loopsStart, () => {})
    if (checkLoopsCross(iLoops, loopsStart)) {
      res.push({ index: i, type: TimerType.SINGLE });
    }
  });
  return res;
};

/*
 * 当定时设置为不循环时，需要确定下一个执行定时的时间点：
 * 如果开始执行的时间大于当前的系统时间，则表示执行定时的日期是今天；
 * 如果开始执行的时间小于当前的系统时间，则表示执行定时的日期是明天；
 */
const translateLoops = (loops: string, time: string, state: boolean) => {
  if (loops !== '0000000') {
    return loops;
  }

  const date = new Date();
  const min = date.getHours() * 60 + date.getMinutes();
  const t = translateTimeToN(time);
  const ln = '0000000'.split('');

  /* 判断输入参数时间是否大于系统当前时间 */
  if (state) {
    if (t > min) {
      ln[date.getDay()] = '1';
    } else {
      ln[(date.getDay() + 1) % 7] = '1';
    }
  } else {
    ln[date.getDay()] = '1';
  }
  return ln.join('');
};

/* 获取当前系统时间的字符串 */
const genCurrentTimeStr = () => {
  const date = new Date();
  return  translateTimeToS(date.getHours() * 60 + date.getMinutes());
}

 /* 修改定时循环规则，针对跨天的操作，将循环规则往后推一天 */
 const loopsStepF = (loops: string) => {
  if (loops === '0000000' || loops === '1111111') {
    return loops;
  }

  const s1 = loops.slice(0, 6);
  const s2 = loops.charAt(6);
  return s2 + s1;
};

/* 将时间从字符串转换成下下整型，同时判断是否跨天，如果跨天则将其拆分为两个同一天的时间段 */
const transTimeStage = (startTime: string, endTime: string, loops: string) => {
  const s1 = translateTimeToN(startTime);
  const s2 = translateTimeToN(endTime);
  if (s1 < s2) {
    return ([{
      startTime: s1,
      endTime: s2,
      loops
    }]);
  } else {
    return ([
    {
      startTime: s1,
      endTime: translateTimeToN('24:00'),
      loops,
    },
    {
      startTime: 0,
      endTime: s2,
      loops: loopsStepF(loops)
    }]);
  }
}
/*
 * 判断两个时间组是否存在冲突
 * st1: 第一个时间组的起始时间
 * st2: 第一个时间组的结束时间
 * l1: 第一个时间组的每周执行日期
 * dt1: 第二个时间组的起始时间
 * dt2: 第二个时间组的结束时间
 * l2: 第二个时间组的每周执行日期
 */
const checkTimeConflit = (st1: string, st2: string, l1: string, dt1: string, dt2: string, l2: string) => {
  let sTimeStage: TimeStage[] = transTimeStage(st1, st2, l1);
  let dTimeStage: TimeStage[] = transTimeStage(dt1, dt2, l2);

  return sTimeStage.map(s => {
            return dTimeStage.map(d => {
                    if (d.endTime < s.startTime || d.startTime > s.endTime) {
                      return false;
                    }
                    return s.loops.split('').map(
                              (i, index) => (i === '1' && d.loops[index] === '1')
                            ).includes(true);
                  }).includes(true);
          }).includes(true);
};

 /* 由定时循环规则转换成显示文字 */
export const transLoopsToStr = (loops: string) => {
  const week = loops.split('');
  const weekStr = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fir.', 'Sat.'];
  const s = weekStr.filter((_w, index) => week[index] === '1');

  if (s.length === 0) {
    return 'No Loop';
  }

  if (s.length >= 7) {
    return 'Every Day';
  }

  return s.join('');
}

export const getCloudGroupTimerList = () => {
  return group_timers;
}

export const getCloudSingleTimerList = () => {
  return single_timers;
}

/* 颜色参数 */
export interface ColorData {
  isColour: boolean;
  h: number;
  s: number;
  t: number;
  b: number;
}

export const addSingleTimer = async (time: string, loops: string, power: boolean, colorMode: number, color: ColorData) => {
  if (single_timers.length >= SINGLE_TIMER_CNT_MAX) {
    return;
  }

  //const conflitList = checkSingleTimerConflit(-1, time, true);
  //if (conflitList.length > 0) {
  //  return conflitList;
  //}

  const colors = [color];
  const timer = {
    id: genLocalSingleTimerFreeId(),
    state: true,
    power,
    loops,
    time,
    colorMode,
    colors,
  }
  updateLocalSingleTimingChange(LOCAL_TIMING_MODE_ADD, timer);
}

export const setSingleTimerState = async (index: number, state: boolean) => {
  if (index < 0 || index >= single_timers.length) {
    return;
  }

  const { id, loops, time, power, colorMode, colors } = single_timers[index];
  
  //const conflitList = checkGroupTimerConflit(startTime, endTime, loops, index, group_timers);
  //if (conflitList.length > 0) {
  //  return conflitList;
  //}

  const timer = {
    id,
    state,
    power,
    loops,
    time,
    colorMode,
    colors,
  }
  updateLocalSingleTimingChange(LOCAL_TIMING_MODE_MOD, timer);
}

/* 修改定时规则 */
export const UpdateSingleTimer = async (index: number, time: string, loops: string, power: boolean, colorMode: number, color: ColorData) => {
  if (index < 0 || index >= single_timers.length) {
    return;
  }

  //const conflitList = checkGroupTimerConflit(startTime, endTime, loops, index, group_timers);
  //if (conflitList.length > 0) {
  //  return conflitList;
  //}

  const colors = [color];
  const { id } = single_timers[index];
  const timer = {
    id,
    state: true,
    power,
    loops,
    time,
    colorMode,
    colors,
  }
  updateLocalSingleTimingChange(LOCAL_TIMING_MODE_MOD, timer);
}

export const deleteSingleTimer = async (index: number) => {
  if (index < 0 || index >= single_timers.length) {
    return;
  }
  updateLocalSingleTimingChange(LOCAL_TIMING_MODE_DEL, single_timers[index]);
}

/* 修改定时规则状态：开启或关闭 */
export const setGroupTimerState = async (index: number, state: boolean) => {
  if (index < 0 || index >= group_timers.length) {
    return;
  }

  const { id, loops, startTime, endTime, colorMode, colors } = group_timers[index];
  const conflitList = checkGroupTimerConflit(startTime, endTime, loops, index);
  if (conflitList.length > 0) {
    return conflitList;
  }

  const timer = {
    id,
    state,
    execuing: false,
    loops,
    startTime,
    endTime,
    colorMode,
    colors,
  }
  updateLocalGroupTimingChange(LOCAL_TIMING_MODE_MOD, timer);
};

/* 根据index删除对应的定时规则 */
export const deleteGroupTimer = async (index: number) => {
  if (index < 0 || index >= group_timers.length) {
    return;
  }
  updateLocalGroupTimingChange(LOCAL_TIMING_MODE_DEL, group_timers[index]);
};

/* 添加定时规则 */
export const addGroupTimer = async (startTime: string, endTime: string, loops: string, colorMode: number, color: ColorData) => {
  if (group_timers.length >= GROUP_TIMER_CNT_MAX) {
    return;
  }

  const conflitList = checkGroupTimerConflit(startTime, endTime, loops, -1);
  if (conflitList.length > 0) {
    //TYSdk.native.simpleTipDialog('add conflit', () => {});
    return conflitList;
  }

  const colors = [color];

  const timer = {
    id: genLocalGroupTimerFreeId(),
    state: true,
    execuing: false,
    loops,
    startTime,
    endTime,
    colorMode,
    colors,
  }
  updateLocalGroupTimingChange(LOCAL_TIMING_MODE_ADD, timer);
};

/* 修改定时规则 */
export const updateGroupTimer = async (index: number, startTime: string, endTime: string, loops: string, colorMode: number, color: ColorData) => {
  if (index < 0 || index >= group_timers.length) {
    return;
  }

  const conflitList = checkGroupTimerConflit(startTime, endTime, loops, index);
  if (conflitList.length > 0) {
    return conflitList;
  }

  const colors = [color];
  const { id } = group_timers[index];
  const timer = {
    id,
    state: true,
    execuing: false,
    loops,
    startTime,
    endTime,
    colorMode,
    colors,
  }
  updateLocalGroupTimingChange(LOCAL_TIMING_MODE_MOD, timer);
};


const genLocalGroupTimerFreeId = () => {
  let id = new Array<boolean>(255).fill(false);
  group_timers.map(t => id[t.id] = true);
  return id.indexOf(false);
}

/* 通过 devId 从云端读取已存在的定时规则，保存到本地缓存中，再刷新显示 */
export const updateLocalGroupTimerList = (timingList: string) => {
  group_timers = parseLocalGroupTimingData(timingList);
};


/* 发送修改定时的命令 */
const updateLocalGroupTimingChange = (mode: number, data: LocalGroupTimingData) => {
  //const d = formatLocalGroupTimingData(mode, data);
  //lampPutDpData({[localTimingModifyCode] : d});

  //TYSdk.native.simpleTipDialog('change: ' + d, () => {});
  let timers = [...group_timers];
  if (mode === LOCAL_TIMING_MODE_ADD) {
    timers.push(data);
  } else if (mode === LOCAL_TIMING_MODE_MOD) {
    const id = timers.findIndex(item => item.id === data.id);
    if (id >= 0) {
      timers[id] = data;
    }
  } else if (mode === LOCAL_TIMING_MODE_DEL) {
    const id = timers.findIndex(item => item.id === data.id);
    if (id >= 0) {
      timers.splice(id, 1);
    }
  }
  const d = formatLocalTimingListData(timers);
  //TYSdk.native.simpleTipDialog('change timer: ' + d, () => {});
  lampPutDpData({[localTimingListCode]: d});
}

export const getGroupTimerParams = (index: number) => {
  if (index < 0 || index >= group_timers.length) {
    return {
      id: 0,
      state: false,
      execuing: false,
      loops: '0000000',
      startTime: '18:00',
      endTime: '08:00',
      isColour: true,
      h: 0,
      s: 1000,
      b: 1000,
      t: 0,
    };
  }
  return group_timers[index];
}

const genLocalSingleTimerFreeId = () => {
  let id = new Array<boolean>(255).fill(false);
  single_timers.map(t => id[t.id] = true);
  return id.indexOf(false);
}

/* 通过 devId 从云端读取已存在的定时规则，保存到本地缓存中，再刷新显示 */
export const updateLocalSingleTimerList = (timingList: string) => {
  single_timers = parseLocalSingleTimingData(timingList);
};


/* 发送修改定时的命令 */
const updateLocalSingleTimingChange = (mode: number, data: LocalSingleTimingData) => {
  //const d = formatLocalSingleTimingData(mode, data);
  //lampPutDpData({[localSingleTimingModifyCode] : d});

  //TYSdk.native.simpleTipDialog('change: ' + d, () => {});
  let timers = [...single_timers];
  if (mode === LOCAL_TIMING_MODE_ADD) {
    timers.push(data);
  } else if (mode === LOCAL_TIMING_MODE_MOD) {
    const id = timers.findIndex(item => item.id === data.id);
    if (id >= 0) {
      timers[id] = data;
    }
  } else if (mode === LOCAL_TIMING_MODE_DEL) {
    const id = timers.findIndex(item => item.id === data.id);
    if (id >= 0) {
      timers.splice(id, 1);
    }
  }
  const d = formatLocalSingleTimingListData(timers);
  lampPutDpData({[localSingleTimingListCode]: d});
}

export const getSingleTimerParams = (index: number) => {
  if (index < 0 || index >= single_timers.length) {
    return {
      id: 0,
      state: false,
      loops: '0000000',
      time: '18:00',
      power: true,
    };
  }
  return single_timers[index];
}
