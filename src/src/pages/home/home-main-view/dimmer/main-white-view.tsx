import _ from 'lodash';
import color from 'color';
import throttle from 'lodash/throttle';
// @ts-ignore
import { Rect } from 'react-native-svg';
import { connect } from 'react-redux';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Utils, TYText, TYSdk, IconFont } from 'tuya-panel-kit';
import { ReduxState } from '../../../../models';
import DpCodes from '../../../../config/dpCodes';
import TopBar from '../../../../components/topbar';
import Res from '../../../../res';
import icons from '../../../../res/iconfont';
import { lampPutDpData, saveLightUpDownSwitch } from '../../../../api';
import { useSelector } from '../../../../models';
import {
  COLOR_DATA,
  saveCloudSingleColor,
  parseCloudSingleColors,
  parseCloudGroupColors,
  genDefaulColor,
  putControlDataDP,
  lampPutDpLightColor,
  lampPutDpLightType,
  detectSLimit,
  lampPutDpSync,
  lampPutDpPower,
  getLightUpDownSwitch,
  setLightUpDownSwitch,
  showGlobalToast,
} from './dimmer-utils';
import { MY_COLORS_DATA, SINGLE_COLORS_CNT_MAX } from './my-colors';
import { EditColorData } from './dimmer-panel';
import DimmerPanelUnits from './dimmer-panel-units';
import { WORKMODE } from '../../../../config';
import { LIGHT_ID } from './dimmer-lights';

const { convertX: cx, winWidth } = Utils.RatioUtils;
const { withTheme } = Utils.ThemeUtils;
const {
  powerCode,
  workModeCode,
  colourCode,
  temperatureCode,
  brightCode,
  functionLevelCode,
  syncCode,
  powerCodeUp,
  workModeCodeUp,
  colourCodeUp,
  temperatureCodeUp,
  brightCodeUp,
  powerCodeDown,
  workModeCodeDown,
  colourCodeDown,
  temperatureCodeDown,
  brightCodeDown,
 } = DpCodes;

const BG_WIDTH = winWidth;
const BG_HEIGHT = winWidth * 0.864;
const POWER_BTN_SIZE = cx(56);

let ScrollOffsetY = 0;

interface HomeMainWhiteViewProps {
  theme?: any;
}

const HomeMainWhiteView: React.FC<HomeMainWhiteViewProps> = ({
  theme: {
    global: {  },
  },
}) => {
  const power = useSelector(state => state.dpState[powerCode]) as boolean;
  const funcLevel = useSelector(state => state.dpState[functionLevelCode]) as string || '';

  const sync = useSelector(state => state.dpState[syncCode]) as boolean;
  const powerUp = useSelector(state => state.dpState[powerCodeUp]) as boolean;
  const powerDown = useSelector(state => state.dpState[powerCodeDown]) as boolean;
  const workMode = useSelector(state => state.dpState[workModeCode]) as string;
  const workModeUp = useSelector(state => state.dpState[workModeCodeUp]) as string;
  const workModeDown = useSelector(state => state.dpState[workModeCodeDown]) as string;
  const colourData = useSelector(state => state.dpState[colourCode]) as string;
  const colourDataUp = useSelector(state => state.dpState[colourCodeUp]) as string;
  const colourDataDown = useSelector(state => state.dpState[colourCodeDown]) as string;
  const temperature = useSelector(state => state.dpState[temperatureCode]) as number;
  const temperatureUp = useSelector(state => state.dpState[temperatureCodeUp]) as number;
  const temperatureDown = useSelector(state => state.dpState[temperatureCodeDown]) as number;
  const brightWrite = useSelector(state => state.dpState[brightCode]) as number;
  const brightWriteUp = useSelector(state => state.dpState[brightCodeUp]) as number;
  const brightWriteDown = useSelector(state => state.dpState[brightCodeDown]) as number;

  const cloudSingleColors = useSelector(state => state.cloudState.singleColors) || '';
  const cloudGroupColors = useSelector(state => state.cloudState.groupColors) || [];
  const cloudLightUpDownSwitch = useSelector(state => state.cloudState.lightUpDownSwitch) || 1;

  const topBarRef = useRef<TopBar>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [lightId, setLightId] = useState<number>(LIGHT_ID.SYNC);
  const [curColors, setCurColors] = useState<COLOR_DATA[]>(
    [
      genDefaulColor(workMode, colourData, brightWrite, temperature),
      genDefaulColor(workModeUp, colourDataUp, brightWriteUp, temperatureUp),
      genDefaulColor(workModeDown, colourDataDown, brightWriteDown, temperatureDown),
    ]
    );
  const singleColors = parseCloudSingleColors(cloudSingleColors);
  const dimmerPanelRef = useRef<DimmerPanelUnits>(null);
  setLightUpDownSwitch(cloudLightUpDownSwitch === 1 ? false : true);

  useEffect(() => {
    //showGlobalToast('cloudLightUpDownSwitch 1: ' + cloudLightUpDownSwitch, true);
    const s = getLightUpDownSwitch();
    const colorUp = genDefaulColor(workModeUp, colourDataUp, brightWriteUp, temperatureUp);
    const colorDown = genDefaulColor(workModeDown, colourDataDown, brightWriteDown, temperatureDown);
    const colors = [
      genDefaulColor(workMode, colourData, brightWrite, temperature),
      s ? colorDown : colorUp,
      s ? colorUp : colorDown,
    ];

    //TYSdk.native.simpleTipDialog('c: ' + JSON.stringify(colors), () => {})
    setCurColors(colors);
  }, [
    cloudLightUpDownSwitch,
    workMode, colourData, brightWrite, temperature,
    workModeUp, colourDataUp, brightWriteUp, temperatureUp,
    workModeDown, colourDataDown, brightWriteDown, temperatureDown
  ]);

  useEffect(() => {
    const s = getLightUpDownSwitch();
    const powers = s ? [power, powerDown, powerUp] : [power, powerUp, powerDown];
    if (sync && lightId !== LIGHT_ID.SYNC) {
      setLightId(LIGHT_ID.SYNC);  
    } else if (!sync && ((lightId === LIGHT_ID.SYNC) || (!powers[lightId]))) {
      setLightId(powers[LIGHT_ID.UP] ? LIGHT_ID.UP : LIGHT_ID.DOWN);
    }
  }, [ sync, cloudLightUpDownSwitch, powerUp, powerDown ]);


  /* 渲染顶部控制栏 */
  const renderTopBar = () => {
    return (
      <TopBar
        ref={topBarRef}
        style={{ position: 'absolute', left: 0, top: 0, }}
        title={TYSdk.devInfo.name}
        backhandle={undefined}
        setting={true}
      />
    );
  }

  const updateTopBarBackground = (offset: number) => {
    const OFFSET_MAX = 80;
    if (ScrollOffsetY >= OFFSET_MAX && offset >= OFFSET_MAX) {
      return;
    }

    ScrollOffsetY = offset;
    const a = offset >= OFFSET_MAX ? 1 : offset / OFFSET_MAX;
    const backgroundColor = color('#fff').alpha(a).rgbString();
    topBarRef.current?.setNativeProps({ backgroundColor });
  }

  const handleRootScroll = (event) => {
    updateTopBarBackground(event.nativeEvent.contentOffset.y);
  }

  /** 电源按键的回调函数 */
  const handlerPower = () => throttle(() => {
    lampPutDpPower(LIGHT_ID.SYNC, !power);
  }, 200); 

  /** 电源按键的回调函数 */
  const handlerLightUpDownSwitch = () => throttle(() => {
    //showGlobalToast('cloudLightUpDownSwitch 3+: ' + cloudLightUpDownSwitch, true);
    const s = getLightUpDownSwitch();
    saveLightUpDownSwitch(s ? 1 : 2);
  }, 200); 
  
  /** 渲染开关按键 */
  const renderPowerBtn = () => {
    return (
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: cx(24), justifyContent: 'space-between', marginTop: cx(24), marginBottom: cx(32) }}>
        <TYText style={{ fontSize: cx(24), marginLeft: -cx(7), color: '#000', fontWeight: '400' }}> {'Setting'} </TYText>
        <View style={{flexDirection: 'row'}}>
          {power &&
          <TouchableOpacity
            accessibilityLabel="HomeDimmer_Dimmer_UpDownSwitch"
            activeOpacity={0.9}
            style={[styles.powerView, {marginRight: cx(24)}]}
            onPress={handlerLightUpDownSwitch()}
          >
            <IconFont d={icons.switch} size={cx(28)} fill={'#000'} stroke={'#000'} />
          </TouchableOpacity>
          }
          <TouchableOpacity
            accessibilityLabel="HomeScene_SceneView_Power"
            activeOpacity={0.9}
            style={[styles.powerView]}
            onPress={handlerPower()}
          >
            <IconFont d={icons.power} size={cx(25)} fill={'#000'} stroke={'#000'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderPowerOffBg = () => {
    const width = winWidth * 0.26;
    const height = width * 0.816;
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1}}>
        <Image
          style={{
            width,
            height,
            marginBottom: cx(16),
          }}
          source={Res.power_off_bg}
        />
        <TYText style={{ fontSize: cx(14), color: '#000' }}> {'Device is offline'} </TYText>
      </View>
    );
  }

  /** 渲染灯串背景页 */
  const renderTitleBg =() => {
    return (
      <Image
        style={{ width: BG_WIDTH, height: BG_HEIGHT, resizeMode: 'stretch' }}
        source={power ? Res.dimmer_bg : Res.dimmer_bg_power_off}
      />
    );
  }


  const handleDimmerChange = useCallback((data: EditColorData, complete: boolean) => {
    // @ts-ignore
    scrollViewRef.current?.setNativeProps({ scrollEnabled: complete });

    const sw = getLightUpDownSwitch();
    const pUp = sw ? powerDown : powerUp;
    const pDown = sw ? powerUp : powerDown;
    /** 若是对应的灯未开启，则不下发调光命令 */
    if (!power || (lightId === LIGHT_ID.SYNC && !sync) || (lightId === LIGHT_ID.UP && (sync || !pUp))
        || (lightId === LIGHT_ID.DOWN && (sync || !pDown))) {
      return;
    }

    const { isColour, h, s, t, b } = data;

    if (complete) {
      //TYSdk.native.simpleTipDialog('change: ' + JSON.stringify(data), () => {})
      lampPutDpLightColor(lightId, {isColour, h, s, t, b });  
    } else {
      if (isColour) {
        putControlDataDP(lightId, h, s, b, 0, 0);
      } else {
        putControlDataDP(lightId, 0, 0, 0, b, t);
      }
    }
  }, [lightId, power, powerUp, powerDown, sync]);

  const handleDimmerTypeSwitch = (isColour: boolean) => {
    lampPutDpLightType(lightId, isColour);
  }

  const handleAddSingleColor = (data: EditColorData) => {
    const { isColour, h, s, t, b } = data;
    const c = { isColour, h, s, t, b };
    const newSingleColors: COLOR_DATA[] = [...singleColors];
    newSingleColors.unshift(c);
    (newSingleColors.length > SINGLE_COLORS_CNT_MAX) && newSingleColors.splice(SINGLE_COLORS_CNT_MAX);
    saveCloudSingleColor(newSingleColors);
  }


  const handleDimmerLightChange = (light: number, s: boolean = false, e: boolean[]) => {
    //TYSdk.native.simpleTipDialog('c: ' + light +',' + s + ',' + e, () => {})
    const sw = getLightUpDownSwitch();
    if (s) {
      lampPutDpData({
        [syncCode]: e[LIGHT_ID.SYNC],
        [sw ? powerCodeDown : powerCodeUp]: e[LIGHT_ID.UP],
        [sw ? powerCodeUp : powerCodeDown]: e[LIGHT_ID.DOWN],
      });
    } else {
      setLightId(light);
    }
  }

  const renderDimmerPanelUnits = () => {
    const s = getLightUpDownSwitch();
    const enableds: boolean[] = s ? [sync, powerDown, powerUp] : [sync, powerUp, powerDown];
    return (
      <DimmerPanelUnits
        ref={dimmerPanelRef}
        colors={curColors}
        colorId={lightId}
        enableds={enableds}
        sLimit={detectSLimit(funcLevel)}
        singleColors={parseCloudSingleColors(cloudSingleColors)}
        groupColors={parseCloudGroupColors(cloudGroupColors)}
        lightLength={2}//{lightLength}
        onlySelected={false}
        onLightChange={handleDimmerLightChange}
        onChange={handleDimmerChange}
        onSwitch={handleDimmerTypeSwitch}
        onMyColorSelected={handleMyColorSelected}
        onMyColorEditting={handleMyColorEditting}
        onAddColor={handleAddSingleColor}
      />
    );
  }

  const handleMyColorSelected = (d: MY_COLORS_DATA, single: boolean) => {
    if (d.data.length <= 0 || d.data.length !== d.stops.length) {
      return;
    }

    if (!single) {
      // TODO
    }
  }

  const handleMyColorEditting = (editting: boolean) => {
    editting && scrollViewRef.current?.scrollToEnd();
  }

  return (
    <View style={styles.container}>
      {power &&
        <ScrollView
          ref={scrollViewRef}
          accessibilityLabel="Dimmer_ScrollView"
          scrollEnabled={true}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollView]}
          onScroll={handleRootScroll}
          scrollEventThrottle={10}
          >
          {renderTitleBg()}
          {renderPowerBtn()}
          {renderDimmerPanelUnits()}
        </ScrollView>
      }
      {!power &&
        <View style={{ flex: 1, alignSelf: 'stretch' }}>
          {renderTitleBg()}
          {renderPowerBtn()}
          {renderPowerOffBg()}
        </View>
      }
      {renderTopBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scrollView: {
    alignSelf: 'stretch',
  },
  btnView: {
    width: '100%',
    height: POWER_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(POWER_BTN_SIZE * 0.5),
  },
  powerView: {
    alignItems: 'center',
    justifyContent: 'center',
    width: POWER_BTN_SIZE,
    height: POWER_BTN_SIZE,
    borderRadius: POWER_BTN_SIZE / 2,
    backgroundColor: '#fff',
    borderColor: '#ededed',
    borderWidth: 1,
  },
});


export default connect(({ cloudState }: ReduxState) => ({
  singleColors: parseCloudSingleColors(cloudState.singleColors || ''),
  groupColors: parseCloudGroupColors(cloudState.groupColors || []),
  light: cloudState.lightColors || '',
  lightUpDownSwitch:cloudState.lightUpDownSwitch,
}))(withTheme(HomeMainWhiteView));

