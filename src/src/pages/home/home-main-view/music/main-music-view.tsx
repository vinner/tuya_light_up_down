/* eslint-disable @typescript-eslint/no-empty-function */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { View, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Utils, TYSdk, TYText, IconFont } from 'tuya-panel-kit';
import { useSelector } from '../../../../models';
import { lampPutDpData } from '../../../../api';
import Res from '../../../../res';
import icons from '../../../../res/iconfont';
import DpCodes from '../../../../config/dpCodes';
import TopBar from '../../../../components/topbar';
import { musicPlay, musicStop } from './music-utils'

const { withTheme } = Utils.ThemeUtils;
const { winWidth, convertX: cx, } = Utils.RatioUtils;
const { powerCode, } = DpCodes;

const LIST_ITEM_HEIGHT = cx(80);
const LIST_ITEM_MARGIN = cx(7);
const LIST_ITEM_ACTIVE_SIZE = cx(18);
const LIST_ITEM_ACTIVE_MARGIN_RIGHT = cx(16);
const LIST_ITEM_ICON_SIZE = LIST_ITEM_HEIGHT - LIST_ITEM_MARGIN * 2;
const LIST_ITEM_ICON_MARGIN_RIGHT = cx(16);
const POWER_BUTTON_SIZE = cx(56);

const MUSIC_LIST_PARAMS = [
  { id: 0, title: 'Jazz', icon: Res.music_lyric },
  { id: 1, title: 'R&B',   icon: Res.music_rb },
  { id: 2, title: 'Hip Hop',   icon: Res.music_pop },
  { id: 3, title: 'Rock',  icon: Res.music_rock },
];

interface MainMusicViewProps {
  theme?: any;
}

const MainMusicView: React.FC<MainMusicViewProps> = ({
  theme: {
    global: { },
  },
}) => {
  const flatListRef = useRef<FlatList<unknown>>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const power = useSelector(state => state.dpState[powerCode]) as boolean;
  const [playing, setPlaying] = useState<boolean>(false);
  const [musicMode, setMusicMode] = useState<number>(-1);

  useEffect(() => {
    if (!power) {
      if (playing) {
        setPlaying(false);
        musicStop();
      }
    } else {
      if (!playing) {
        setPlaying(true);
        if (musicMode < 0) {
          setMusicMode(0);
          musicPlay(0);
        } else {
          musicPlay(musicMode);
        }
      }
    }
  }, [power]);

  const handleItemSelected = (id: number) => {
    if (!power) {
      return;
    }

    setMusicMode(id);
    musicPlay(id);
  };

  /** 渲染音乐律动列表元素 */
  const renderItem = useCallback(({ item }) => {
    const active = (item.id === musicMode) ? true : false;
    return (
      <View style={{ marginHorizontal:cx(24) }}
      >
        <TouchableOpacity
          accessibilityLabel="HomeScene_SceneView_Select"
          activeOpacity={0.9}
          style={[styles.musicView]}
          onPress={() => handleItemSelected(item.id)}
        >
          <Image
            style={{
              width: LIST_ITEM_ICON_SIZE,
              height: LIST_ITEM_ICON_SIZE,
              borderRadius: LIST_ITEM_ICON_SIZE * 0.5,
              marginRight: LIST_ITEM_ICON_MARGIN_RIGHT,
            }}
            source={item.icon}
          />
          <TYText style={{ flex: 1, fontSize: cx(12), color: '#04001E' }}> {item.title} </TYText>
          { active &&
          <Image
            style={{
              width: LIST_ITEM_ACTIVE_SIZE,
              height: LIST_ITEM_ACTIVE_SIZE,
              marginRight: LIST_ITEM_ACTIVE_MARGIN_RIGHT,
            }}
            source={Res.music_active}
          />
          }
        </TouchableOpacity>
      </View>
    );
  }, [musicMode, power]);

  /** 渲染音乐律动列表 */
  const renderMusicList = () => {
    const datas = [...MUSIC_LIST_PARAMS];
    return (
        <View style={{ flex: 1 }}>
          <FlatList
            accessibilityLabel="HomeMusic_FlatListRef"
            ref={flatListRef}
            initialScrollIndex={0}
            data={datas}
            renderItem={renderItem}
            keyExtractor={(_, idx) => `${idx}`}
          />
        </View>
    );
  };

  /** 渲染音乐律动标题 */
  const renderTitle = () => {
    return (
      <View style={styles.titleView}>
        <TYText style={styles.title}>{'Music Mode'}</TYText>
        {renderPower()}
      </View>
    );
  };

  /** 电源开关控制回调函数 */
  const handlerPower = () => throttle(() => {
      lampPutDpData({ [powerCode]: !power });
    }, 200); 

  /** 渲染电源开关按键 */
  const renderPower = () => {
    return (
      <TouchableOpacity
        accessibilityLabel="HomeScene_SceneView_Power"
        activeOpacity={0.9}
        style={[styles.powerView]}
        onPress={handlerPower()}
      >
        <IconFont d={icons.power} size={cx(25)} fill={'#000'} stroke={'#000'} />
      </TouchableOpacity>
    );
  };

  /* 渲染顶部控制栏 */
  const renderTopBar = () => {
    return (
      <TopBar
        title={TYSdk.devInfo.name}
        backhandle={undefined}
      />
    );
  }

  /** 渲染关灯时的背景图标 */
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

  return (
    <View style={styles.root}>
      <View style={[styles.container]}>
        {renderTopBar()}
        {power &&
        <ScrollView
          ref={scrollViewRef}
          accessibilityLabel="CustomScene_ScrollView"
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollView]}
          >
          {renderTitle()}
          {renderMusicList()}
        </ScrollView>
        }
        {!power &&
        <View style={{ flex: 1, alignSelf: 'stretch' }}>
          {renderTitle()}
          {renderPowerOffBg()}
        </View>
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  container: {
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    alignSelf: 'stretch',
  },
  powerView: {
    alignItems: 'center',
    justifyContent: 'center',
    width: POWER_BUTTON_SIZE,
    height: POWER_BUTTON_SIZE,
    borderRadius: POWER_BUTTON_SIZE / 2,
    borderColor: '#ededed',
    borderWidth: 1,
  },
  titleView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: cx(24),
    marginTop: cx(12),
    marginBottom: cx(24),
  },
  title: {
    fontSize: cx(24),
    fontWeight: '400',
    color: '#000',
  },
  musicView: {
    flex: 1,
    height: LIST_ITEM_HEIGHT,
    borderRadius: LIST_ITEM_HEIGHT * 0.5,
    paddingHorizontal: LIST_ITEM_MARGIN,
    marginBottom: cx(24),
    borderWidth: 1,
    borderColor: '#E7E7E7',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
});

export default withTheme(MainMusicView);
