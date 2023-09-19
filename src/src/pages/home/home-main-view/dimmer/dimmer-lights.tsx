import _ from 'lodash';
import React from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Utils, SwitchButton, TYText } from 'tuya-panel-kit';
import { COLOR_DATA } from './dimmer-utils';
import Res from '../../../../res';
import { getColorRgba, getWhiteRgba } from '@utils';

const {
  ThemeUtils: { withTheme },
} = Utils;

const { convertX: cx, winWidth } = Utils.RatioUtils;

const VIEW_MARGIN_H = cx(24);
const VIEW_HEIGHT = cx(144);
const VIEW_WIDTH = winWidth - VIEW_MARGIN_H * 2;
const LIGHT_HEIGHT = VIEW_HEIGHT;
const LIGHT_WIDTH = cx(47);
const LIGHT_MARGIN_H = cx(10);
const LINE_RIGHT_WIDTH = cx(30);
const LINE_RIGHT_HEIGHT = 1;
const LINE_LEFT_WIDTH = cx(30);
const LINE_LEFT_HEIGHT = cx(103);

const COLOR_VIEW_SIZE = cx(40);     // 颜色整个控件的大小（包括选中状态）
const COLOR_SIZE = cx(32);          // 颜色控件的大小
const COLOR_VIEW_MARGIN_H = cx(4);

const SWITCH_HEIGHT = cx(30);       // 开关控件的高
const SWITCH_WIDDTH = cx(50);       // 开关控件的宽

/** 灯的ID */
export enum LIGHT_ID {
  SYNC = 0,   // 上下灯同步
  UP,         // 上灯
  DOWN,       // 下灯
  MAX,
};

interface DimmerLightsProps {
  theme?: any;
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
  colors?: COLOR_DATA[];                  // 颜色数据，若是没有，则只渲染名称，用于场景DIY界面
  enabled: boolean[];                     // 同步或上下灯分控的开关状态
  id: number;                             // 当前选中状态的灯ID
  onSelectedChange: (id) => void;         // 灯颜色选中时的回调函数
  onSwitchChange: (id, enabled) => void;  // 灯状态开关切换的回调函数
};

interface DimmerLightsStates {
}

class DimmerLights extends React.Component<DimmerLightsProps, DimmerLightsStates> {
  constructor(props: DimmerLightsProps) {
    super(props);
  }

  /** 开关切换执行函数 */
  handleSwitchPress = (light: number, e: boolean) => {
    const { onSwitchChange, enabled } = this.props;
    let es: boolean[] = [...enabled];

    switch (light) {
      case LIGHT_ID.SYNC:
        if (e || (!e && (enabled[LIGHT_ID.UP] || enabled[LIGHT_ID.DOWN]))) {
          es[LIGHT_ID.SYNC] = e;
        } else {
          es = [false, true, true];
        }
        break;
      case LIGHT_ID.UP:
        if (enabled[LIGHT_ID.SYNC]) {
          es = [false, true, false];
        } else {
          if (e || (!e && enabled[LIGHT_ID.DOWN])) {
            es[LIGHT_ID.UP] = e;
          } else {
            es[LIGHT_ID.SYNC] = true;
          }
        }
        break;
      case LIGHT_ID.DOWN:
        if (enabled[LIGHT_ID.SYNC]) {
          es = [false, false, true];
        } else {
          if (e || (!e && enabled[LIGHT_ID.UP])) {
            es[LIGHT_ID.DOWN] = e;
          } else {
            es[LIGHT_ID.SYNC] = true;
          }
        }
        break;
    }

    onSwitchChange && onSwitchChange(light, es);
  }

  /** 颜色点击执行函数 */
  handleColorPress = (light: number) => {
    let enable = false
    switch (light) {
      case LIGHT_ID.SYNC:
        enable = this.props.enabled[light];
        break;
      case LIGHT_ID.UP:
      case LIGHT_ID.DOWN:
        if (this.props.enabled[LIGHT_ID.SYNC]) {
          enable = false;
        } else {
          enable = this.props.enabled[light];
        }
        break;
    }

    if (enable) {
      this.props.onSelectedChange && this.props.onSelectedChange(light);
    }
  }

  /** 渲染开关切换控件 */
  renderSwitch = (light: number) => {
    const { enabled } = this.props;
    let value = false;

    switch (light) {
      case LIGHT_ID.SYNC:
        value = enabled[LIGHT_ID.SYNC];
        break;
      case LIGHT_ID.UP:
        value = enabled[LIGHT_ID.SYNC] ? false : enabled[LIGHT_ID.UP];
        break;
      case LIGHT_ID.DOWN:
        value = enabled[LIGHT_ID.SYNC] ? false : enabled[LIGHT_ID.DOWN];
        break;
    }
    return (
      <SwitchButton
        value={value}
        onValueChange={v => this.handleSwitchPress(light, v)}
        style={{ }}
        thumbStyle={{
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
          }}
        theme={{ onTintColor: '#05001d', onThumbTintColor: '#FFF' }}
      />
    );
  }

  /** 渲染颜色和灯名称的控件 */
  renderColorView = (light: number) => {
    const { id, colors, enabled } = this.props;

    /** 判断是否需要渲染颜色控制，若是没有颜色数据，则只渲染名称 */
    if (colors && colors.length > light) {
      const c = colors[light];
      const upText = light === LIGHT_ID.SYNC ? 'Sync' : light === LIGHT_ID.UP ? '' : 'Down';
      const dowmText = light === LIGHT_ID.SYNC ? '' : light === LIGHT_ID.UP ? 'Up' : '';;

      /** 若是非开启的灯，颜色不可以点击，而且颜色有一定的透明度，提示用户不可点击 */
      let disabled = false;
      switch (light) {
        case LIGHT_ID.SYNC:
          disabled = !enabled[LIGHT_ID.SYNC];
          break;
        case LIGHT_ID.UP:
          disabled = enabled[LIGHT_ID.SYNC] ? true : !enabled[LIGHT_ID.UP];
          break;
        case LIGHT_ID.DOWN:
          disabled = enabled[LIGHT_ID.SYNC] ? true : !enabled[LIGHT_ID.DOWN];
          break;
      }

      /** 生成灯的颜色数据 */
      const bright = disabled ? 300 : 1000;
      const color = c.isColour ? getColorRgba(c.h, c.s, bright) : getWhiteRgba(c.t, bright);

      return (
        <View>
          <TYText style={styles.colorNameText}> {upText} </TYText>
          <TouchableOpacity
            disabled={disabled}
            style={[styles.colorView, id === light && styles.colorViewActive]}
            onPress={() => this.handleColorPress(light)}
          >
            <View style={[styles.color, {backgroundColor: color}]}/>
          </TouchableOpacity>
          <TYText style={styles.colorNameText}> {dowmText} </TYText>
        </View>
      )
    } else {
      /** 只渲染名称 */
      const text = light === LIGHT_ID.SYNC ? 'Sync' : light === LIGHT_ID.UP ? 'Up' : 'Down';
      return (
        <View style={styles.colorView}>
          <TYText style={styles.colorNameText}> {text} </TYText>
        </View>
      );
    }

  }

  /** 渲染右边部分上下灯分控的控件 */
  renderUpDownLight = () => {
    const { colors } = this.props;
    const viewHeight = (colors && colors.length > 0) ? LINE_LEFT_HEIGHT + COLOR_VIEW_SIZE + cx(35) : LINE_LEFT_HEIGHT + cx(45);
    return (
      <View style={{alignItems: 'center', justifyContent: 'space-between', height: viewHeight}}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <View style={styles.lineRight} />
          { this.renderColorView(LIGHT_ID.UP) }
          { this.renderSwitch(LIGHT_ID.UP) }
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <View style={styles.lineRight} />
          { this.renderColorView(LIGHT_ID.DOWN) }
          { this.renderSwitch(LIGHT_ID.DOWN) }
        </View>
      </View>
    )
  }

  render() {
    return (
      <View style={styles.container}>
        {this.renderSwitch(LIGHT_ID.SYNC)}
        {this.renderColorView(LIGHT_ID.SYNC)}
        <View style={styles.lineLeft} />
        <Image style={styles.lightView} source={Res.light_bg} />
        {this.renderUpDownLight()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    marginHorizontal: VIEW_MARGIN_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightView: {
    width: LIGHT_WIDTH,
    height: LIGHT_HEIGHT,
    marginHorizontal: LIGHT_MARGIN_H,
  },
  lineLeft: {
    width: LINE_LEFT_WIDTH,
    height: LINE_LEFT_HEIGHT,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DADADA',
  },
  lineRight: {
    width: LINE_RIGHT_WIDTH,
    height: LINE_RIGHT_HEIGHT,
    backgroundColor: '#DADADA',
  },
  colorName: {

  },
  colorNameText: {
    fontSize: cx(10),
    color: '#9997a3',
    textAlign: 'center',
  },
  colorView: {
    width: COLOR_VIEW_SIZE,
    height: COLOR_VIEW_SIZE,
    marginHorizontal: COLOR_VIEW_MARGIN_H,
    marginVertical: cx(2),
    borderRadius: COLOR_VIEW_SIZE * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  colorViewActive: {
    borderWidth: 1,
    borderColor: '#00AD3C',
  },
  color: {
    width: COLOR_SIZE,
    height: COLOR_SIZE,
    borderRadius: COLOR_SIZE * 0.5,
  },
  switch: {
    width: SWITCH_WIDDTH,
    height: SWITCH_HEIGHT,
    borderRadius: SWITCH_HEIGHT * 0.5,
  }
});

export default withTheme(DimmerLights);