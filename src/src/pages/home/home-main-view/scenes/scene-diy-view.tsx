import _, {  } from 'lodash';
import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Utils, TYText, Collapsible, IconFont, TYSdk } from 'tuya-panel-kit';
import { SCENE_ENTRY, flash_mode_configs } from './scene-config';
import Res from '../../../../res';
import icons from '../../../../res/iconfont';
import SliderSelector from '../../../../components/SliderSelector';
import { getColorRgba, getWhiteRgba, randomHsb } from '@utils';
import { EditColorData } from '../dimmer/dimmer-panel';
import SceneDiyDimmer from './scene-diy-dimmer-view';
import Popup from '../../../../components/popup';
import {
  lampSceneValue, saveCloudDiyScene, SCENE_TYPE,
} from './scene-utils'
import DimmerLights, { LIGHT_ID } from '../dimmer/dimmer-lights';
import { showGlobalToast } from '../dimmer/dimmer-utils';

const {
  ThemeUtils: { withTheme },
} = Utils;

const { convertX: cx, winWidth, } = Utils.RatioUtils;

const ITEM_CNT_PRELINE = 4;             // DIY场景个数
const ITEM_MARGIN_H = cx(24);           // DIY场景元素水平Margin大小
const ITEM_INTERVAL = cx(15);           // DIY场景元素之间的间隔大小
const ITEM_TEXT_MARGIN_TOP = cx(8);     // DIY场景元素上的文字margin上方的距离
const ITEM_FONT_SIZE = cx(10);          // DIY场景元素上的文字字体大小
const ITEM_MARING_BOTTOM = cx(24);      // DIY场景元素margin下方的距离
/** DIY场景元素的图片大小 */
const ITEM_IMAGE_SIZE = (winWidth - ITEM_MARGIN_H * 2 - ITEM_INTERVAL * (ITEM_CNT_PRELINE - 1)) / ITEM_CNT_PRELINE;
/** DIY场景元素的总宽度 */
const ITEM_VIEW_WIDTH = ITEM_IMAGE_SIZE + ITEM_INTERVAL;
const ITEM_VIEW_MARGIN_H = ITEM_MARGIN_H - ITEM_INTERVAL * 0.5;

const FLASH_MODE_ITEM_WIDTH = (winWidth - cx(57)) * 0.5;
const FLASH_MODE_ITEM_HEIGHT = cx(44);

const COLOR_CNT_MAX = 7;                // 颜色最大数量
const COLOR_MARGIN_H = cx(20);          // 颜色的水平margin距离
const COLOR_INTERVAL = cx(7);           // 颜色之前的间隔
/** 颜色的总体大小 */
const COLOR_VIEW_SIZE = (winWidth - COLOR_MARGIN_H * 2 - COLOR_INTERVAL * (COLOR_CNT_MAX - 1)) / COLOR_CNT_MAX;
/** 颜色中间颜色控制的大小 */
const COLOR_ITEM_SIZE = COLOR_VIEW_SIZE - cx(8);


interface SceneDiyProps {
  theme?: any;
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
  diyDatas: SCENE_ENTRY[];
  currSceneId: number;
  singleColors;
  groupColors;
  lightLength;
  onItemSelected: (item) => void;
  onParamsChange: (complete: boolean) => void;
};

interface SceneDiyStates {
  index: number;
  collapsed: boolean;
  edittingUp: boolean;
  edittingDown: boolean;
  edittingSync: boolean;
  selected: boolean[];
  editColor: EditColorData;
  editLight: number;
  editIndex: number;
}

class SceneDiy extends React.Component<SceneDiyProps, SceneDiyStates> {
  constructor(props: SceneDiyProps) {
    super(props);

    const index = props.diyDatas.findIndex(d => d.value.id === props.currSceneId);
    this.state = {
      index,
      collapsed: true,
      edittingUp: false,
      edittingDown: false,
      edittingSync: false,
      selected: new Array(COLOR_CNT_MAX).fill(false),
      editColor: { isColour: true, h: 0, s: 1000, t: 1000, b: 1000 },
      editLight: -1,
      editIndex: -1,
    }
  }

  componentWillReceiveProps(nextProps: Readonly<SceneDiyProps>): void {
    if (nextProps.currSceneId !== this.props.currSceneId ||
        nextProps.diyDatas !== this.props.diyDatas) {
      this.setState({
        index: nextProps.diyDatas.findIndex(d => d.value.id === nextProps.currSceneId),
      })
    }
    //TYSdk.native.simpleTipDialog('rec: ' + JSON.stringify(nextProps.diyDatas), () => {});
  }

  /** DIY 场景点击回调函数 */
  handleItemPress = (item) => {
    this.props.onItemSelected(item);
  }

  /** 渲染 DIY 场景单个元素 */
  renderItem = (item, index) => {
    const { currSceneId } = this.props;

    const first = (index % ITEM_CNT_PRELINE === 0) ? true : false;
    const end = (index % ITEM_CNT_PRELINE === (ITEM_CNT_PRELINE - 1)) ? true : false;
    const active = (item.value.id === currSceneId) ? true : false;

    return (
      <View
        style={[
          styles.itemView,
          {
            marginLeft: first ? ITEM_VIEW_MARGIN_H : 0,
            marginRight: end ? ITEM_VIEW_MARGIN_H : 0,
          }
        ]}>
        <TouchableOpacity
          accessibilityLabel="HomeScene_SceneView_Select"
          activeOpacity={0.9}
          style={[styles.iconTouch, active && styles.iconActive ]}
          onPress={() => this.handleItemPress(item)}
        >
          <Image style={styles.itemImage} source={item.image} />
        </TouchableOpacity>

        <TYText style={active ? styles.itemTextActive : styles.itemText}> {item.title} </TYText>
      </View>
    );
  };

  /** 渲染 DIY 场景 */
  renderDiyItems = () => {
    return (
      <View style={{ width: '100%' }}>
        <View style={{ width: '100%', flexDirection: 'row' }}>
          {this.props.diyDatas.map((d, i) => this.renderItem(d, i))}
        </View>
        <View style={{ height: 0.5, width: '100%', backgroundColor: '#dcdadd' }}/>
      </View>
    );
  }

  /** 渲染标题 */
  renderTitle = (title: string) => {
    return (
      <TYText style={{ fontSize: cx(24), marginLeft: cx(17), fontWeight: '400', textAlign: 'left' }}> {title} </TYText>
    );
  }

  /** 变化模式点击回调函数 */
  handleFlashModePress = (mode: number) => {
    const newDiyDatas = [...this.props.diyDatas]
    newDiyDatas[this.state.index].value.mode = mode;
    newDiyDatas[this.state.index].value.mode2 = mode;

    lampSceneValue(newDiyDatas[this.state.index].value);
    saveCloudDiyScene(newDiyDatas);
  }

  /** 渲染变化模式单个列表元素 */
  renderFlashModeItem = (title: string, mode: number) => {
    const { diyDatas } = this.props;
    const active = diyDatas[this.state.index].value.mode === mode ? true : false;
    return (
      <TouchableOpacity
        style={{
          width: FLASH_MODE_ITEM_WIDTH,
          height: FLASH_MODE_ITEM_HEIGHT,
          borderRadius: cx(22),
          borderWidth: 0.5,
          borderColor: active ? '#00AD3C' : '#DADADA',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: cx(16),
        }}
        onPress={() => this.handleFlashModePress(mode)}
      >
        <TYText style={{ fontSize: cx(12), color: active ? '#00AD3C' : '#020914' }}> {title} </TYText>
      </TouchableOpacity>
    )
  }

  /** 渲染变化模式固件列表 */
  renderFlashModeBase = () => {
    const fc = flash_mode_configs; //.slice(0, 2);
    return (
      <View style={{ width: winWidth, flexDirection: 'row', flexWrap: 'wrap',  paddingHorizontal: cx(24), marginTop: cx(24), justifyContent: 'space-between' }}>
        {fc.map(f => this.renderFlashModeItem(f.title, f.mode))}
      </View>
    );
  }

  /** 渲染变化模式缩进列表，可点击按键展开或缩进列表 */
  renderFlashModeMore = () => {
    const fc = flash_mode_configs.slice(2);
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Collapsible
          collapsed={this.state.collapsed}
          align="center"
        >
          <View style={{ width: winWidth, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: cx(24), justifyContent: 'space-between' }}>
            {fc.map(f => this.renderFlashModeItem(f.title, f.mode))}
          </View>
        </Collapsible>
        <TouchableOpacity
          style={{ flexDirection: 'row', marginVertical: cx(8), alignItems: 'center', justifyContent: 'center' }}
          onPress={() => this.setState({ collapsed: !this.state.collapsed })}
        >
          <TYText style={{color: '#00AD3C', fontSize: cx(14)}}> {'More'} </TYText>
          <IconFont d={ this.state.collapsed ? icons.down : icons.up} size={cx(14)} fill={'#00AD3C'} stroke={'#00AD3C'} />
        </TouchableOpacity>
      </View>
    );
  }

  /** 颜色编辑界面提交的执行函数 */
  handleColorChange = (data: EditColorData) => {
    this.setState({ editColor: data });
  }

  /** 渲染颜色编辑界面 */
  renderDimmerPanel = (color: EditColorData) => {
    return (
      <SceneDiyDimmer
        color={color}
        singleColors={this.props.singleColors}
        groupColors={this.props.groupColors}
        lightLength={this.props.lightLength}
        onColorChange={this.handleColorChange}
      />
    );
  }

  /** 颜色更新的函数执行 */
  handleColorUpdate = () => {
    const { index, editLight, editIndex, editColor } = this.state;

    /** 判断是添加颜色还是更新颜色 */
    if (editIndex < 0) {
      const newDiyDatas = [...this.props.diyDatas];
      const lightCnt = editLight === LIGHT_ID.UP ? newDiyDatas[index].value.colors.length
                        : editLight === LIGHT_ID.DOWN ? newDiyDatas[index].value.colors2.length
                        : newDiyDatas[index].value.colors3.length;

      /** 判断颜色数量是否已经达到最大 */
      if (lightCnt >= COLOR_CNT_MAX) {
        return;
      }

      editLight === LIGHT_ID.UP ? newDiyDatas[index].value.colors.push(editColor)
        : editLight === LIGHT_ID.DOWN ? newDiyDatas[index].value.colors2.push(editColor)
        : newDiyDatas[index].value.colors3.push(editColor);

      lampSceneValue(newDiyDatas[index].value);
      saveCloudDiyScene(newDiyDatas);
    } else {
      const newDiyDatas = [...this.props.diyDatas]

      editLight === LIGHT_ID.UP ? newDiyDatas[index].value.colors[editIndex] = editColor
        : editLight === LIGHT_ID.DOWN ? newDiyDatas[index].value.colors2[editIndex] = editColor
        : newDiyDatas[index].value.colors3[editIndex] = editColor;

      lampSceneValue(newDiyDatas[index].value);
      saveCloudDiyScene(newDiyDatas);
    }
  }

  /** 添加颜色 */
  handleAddColor = (light: number) => {
    this.setState({ editLight: light, editIndex: -1 });
    const hsb = randomHsb();
    const color: EditColorData = { isColour: true, h: hsb[0], s: 1000, t: 0, b: 1000 };
    Popup.custom({
      content: (this.renderDimmerPanel(color)),
      footerType: 'singleConfirm',
      confirmText: 'Confirm',
      confirmTextStyle: { color: '#fff', fontWeight: 'normal' },
      footerWrapperStyle: { marginBottom: cx(24) },
      showTitleDivider: false,
      onMaskPress: ({ close }) => close(),
      onConfirm: (_data, { close }) => {
        setTimeout(() => this.handleColorUpdate(), 500);
        close();
      },
    });
  }

  /** 弹出颜色编辑框 */
  handleEditColor = (color: EditColorData) => {
    Popup.custom({
      content: (this.renderDimmerPanel(color)),
      footerType: 'singleConfirm',
      confirmText: 'Confirm',
      confirmTextStyle: { color: '#fff', fontWeight: 'normal' },
      footerWrapperStyle: { marginBottom: cx(24) },
      showTitleDivider: false,
      onMaskPress: ({ close }) => close(),
      onConfirm: (_data, { close }) => {
        setTimeout(() => this.handleColorUpdate(), 500);
        close();
      },
    });
  }

  /** 点击颜色进入编辑状态的执行函数 */
  handleColorPress = (light: number, index: number) => {
    const { edittingUp, edittingDown, edittingSync, selected } = this.state;
    const editting = light === LIGHT_ID.UP ? edittingUp : light === LIGHT_ID.DOWN ? edittingDown : edittingSync;

    if (editting) {
      const newSelected = [...selected];
      newSelected[index] = !newSelected[index];
      this.setState({ selected: newSelected });
    } else {
      const { diyDatas } = this.props;
      const color = light === LIGHT_ID.UP ? diyDatas[this.state.index].value.colors[index]
                    : light === LIGHT_ID.DOWN ? diyDatas[this.state.index].value.colors2[index]
                    : diyDatas[this.state.index].value.colors3[index];

      this.handleEditColor(color);
      this.setState({
        editColor: color,
        editLight: light,
        editIndex: index,
      })
    }
  }

  /** 删除颜色的执行函数 */
  handleColorsDelete = (light: number) => {
    const { index, selected } = this.state;
    const newDiyDatas = [...this.props.diyDatas]
    const colors =  light === LIGHT_ID.UP ? [...newDiyDatas[index].value.colors]
                  : light === LIGHT_ID.DOWN ? [...newDiyDatas[index].value.colors2]
                  : [...newDiyDatas[index].value.colors3];

    for (let i = colors.length - 1; i >= 0; i --) {
      if (selected[i]) {
        colors.splice(i, 1);
      }
    }

    /** 不可以删除所有的颜色 */
    if (colors.length > 0) {
      light === LIGHT_ID.UP ? newDiyDatas[index].value.colors = colors :
      light === LIGHT_ID.DOWN ? newDiyDatas[index].value.colors2 = colors :
      newDiyDatas[index].value.colors3 = colors;

      lampSceneValue(newDiyDatas[index].value);
      saveCloudDiyScene(newDiyDatas);        
    } else {
      // TODO
    }

    let newSelected = [...selected];
    newSelected.fill(false);

    light === LIGHT_ID.UP ? this.setState({ edittingUp: false, selected: newSelected }) :
    light === LIGHT_ID.DOWN ? this.setState({ edittingDown: false, selected: newSelected }) :
    this.setState({ edittingSync: false, selected: newSelected });
  }

  /** 渲染颜色标题 */
  renderColorsTitle = () => {
    return (
      <View style={{ width: winWidth, flexDirection: 'row', marginVertical: cx(24), justifyContent: 'space-between' }} >
        {this.renderTitle('Scene Colors')}
      </View>
    );
  }

  handleLightsSwitch = (_light: number, e: boolean[]) => {
    const { index } = this.state;
    const newDiyDatas = [...this.props.diyDatas]

    if (e[LIGHT_ID.SYNC]) {
      newDiyDatas[index].value.type = SCENE_TYPE.SYNC;
    } else if (e[LIGHT_ID.UP] && e[LIGHT_ID.DOWN]) {
      newDiyDatas[index].value.type = SCENE_TYPE.ASYNC;
    } else if (e[LIGHT_ID.UP]) {
      newDiyDatas[index].value.type = SCENE_TYPE.UP;
    } else {
      newDiyDatas[index].value.type = SCENE_TYPE.DOWN;
    }

    lampSceneValue(newDiyDatas[index].value);
    saveCloudDiyScene(newDiyDatas);
  }

  renderLights = () => {
    const { diyDatas } = this.props;
    const { index } = this.state;

    if (index < 0 || index >= diyDatas.length) {
      return;
    }

    let enabled: boolean[] = [];

    switch (diyDatas[index].value.type) {
      case SCENE_TYPE.SYNC:
        enabled = [ true, false, false ];
        break;
      case SCENE_TYPE.ASYNC:
        enabled = [ false, true, true ];
        break;
      case SCENE_TYPE.UP:
        enabled = [ false, true, false ];
        break;
      case SCENE_TYPE.DOWN:
        enabled = [ false, false, true ];
        break;
    }

    return (
      <DimmerLights
        id={0}
        enabled={enabled}
        onSelectedChange={() => {}}
        onSwitchChange={this.handleLightsSwitch}
      />
    );
  }

  /** 渲染单个颜色控件 */
  renderColorItem = (color, light, index) => {
    const { edittingUp, edittingDown, edittingSync } = this.state;
    const editting = light === LIGHT_ID.UP ? edittingUp : light === LIGHT_ID.DOWN ? edittingDown : edittingSync;

    const bg = color.isColour ? getColorRgba(color.h, color.s, color.b) : getWhiteRgba(color.t, color.b);
    const active = editting ? this.state.selected[index] : false;
    return (
      <TouchableOpacity
        style={{
          width: COLOR_VIEW_SIZE, 
          height: COLOR_VIEW_SIZE,
          borderRadius: COLOR_VIEW_SIZE * 0.5,
          justifyContent: 'center',
          alignItems: 'center',
          borderColor: '#00AD3C',
          borderWidth: active ? 1 : 0,
          marginLeft: index === 0 ? COLOR_MARGIN_H : 0,
          marginRight: index === (COLOR_CNT_MAX - 1) ? COLOR_MARGIN_H : COLOR_INTERVAL,
        }}
        onPress={() => this.handleColorPress(light, index)}
      >
        <View style={{ width: COLOR_ITEM_SIZE, height: COLOR_ITEM_SIZE, borderRadius: COLOR_ITEM_SIZE * 0.5, backgroundColor: bg }}/>
      </TouchableOpacity>
    );
  }

  handleSetEditting = (light: number, e: boolean) => {
    light === LIGHT_ID.UP ? this.setState({ edittingUp: e}) :
    light === LIGHT_ID.DOWN ? this.setState({ edittingDown: e}) :
    this.setState({ edittingSync: e});
  }

  /** 渲染颜色操作按键，支持颜色的添加、删除功能 */
  renderOptButtons = (light: number) => {
    const { edittingUp, edittingDown, edittingSync } = this.state;
    const editting = light === LIGHT_ID.UP ? edittingUp : light === LIGHT_ID.DOWN ? edittingDown : edittingSync;

    if (editting) {
      return (
        <View style={styles.btns_panel_cancel}>
          <TouchableOpacity style={[styles.btn_left, styles.btn_center]} onPress={() => this.handleSetEditting(light, false)}>
            <TYText style={styles.btn_text_confirm}> {'Cancel'} </TYText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn_right} onPress={() => this.handleColorsDelete(light)}>
            <TYText style={styles.btn_text_delete}> {'Delete'} </TYText>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.btns_panel}>
          <TouchableOpacity style={[styles.btn_left, styles.btn_center]} onPress={() => this.handleSetEditting(light, true)}>
            <TYText style={styles.btn_text_confirm}> {'Edit'} </TYText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn_right} onPress={() => this.handleAddColor(light)}>
            <TYText style={styles.btn_text_add}> {'Add'} </TYText>
          </TouchableOpacity>
        </View>
      );
    }
  }

  /** 渲染颜色列表 */
  renderColors = (light: number) => {
    const { diyDatas } = this.props;
    const { index } = this.state;

    if (index < 0 || index >= diyDatas.length) {
      return;
    }

    const title = light === LIGHT_ID.SYNC ? 'Sync' : light === LIGHT_ID.UP ? 'Up' : 'Down';

    let newColors = light === LIGHT_ID.UP ? [...diyDatas[index].value.colors] :
                    light === LIGHT_ID.DOWN ? [...diyDatas[index].value.colors2] :
                    [...diyDatas[index].value.colors3];
    if (newColors.length > COLOR_CNT_MAX) {
      newColors.splice(COLOR_CNT_MAX);
    }

    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: cx(24) }}>
        <View style={{ width: winWidth, flexDirection: 'row', paddingHorizontal: cx(24), justifyContent: 'space-between', alignItems: 'center' }}>
          <TYText style={{ fontSize: cx(14), color: '#04001E'}}> {title} </TYText>
          {this.renderOptButtons(light)}
        </View>

        <View style={{ width: winWidth, flexDirection: 'row', marginTop: cx(20) }}>
          {newColors.length > 0 && newColors.map((c, i) => this.renderColorItem(c, light, i)) }
        </View>
      </View>
    );
  }

  /** 变化速度控制条响应函数 */
  handleSpeed = (v: number, complete: boolean) => {
    this.props.onParamsChange(complete);

    if (complete) {
      const newDiyDatas = [...this.props.diyDatas]
      newDiyDatas[this.state.index].value.interval = v;
      newDiyDatas[this.state.index].value.time = v;
  
      lampSceneValue(newDiyDatas[this.state.index].value);
      saveCloudDiyScene(newDiyDatas);  
    }
  }

  /** 渲染场景变化速度控制条 */
  renderBlinkRate = () => {
    const v = this.props.diyDatas[this.state.index].value.time;
    return (
      <View style={{ width: winWidth - cx(48), marginHorizontal: cx(24), marginBottom: cx(40)}}>
        <TYText style={{ fontSize: cx(14), color: '#04001E', marginBottom: cx(16), marginLeft: -cx(4), marginTop: cx(24) }}> {'Frequency'} </TYText>
        <SliderSelector
          imgLeft= {Res.slider_speed}
          minValue={1}
          maxValue={100}
          value={v}
          onSlidingComplete={this.handleSpeed}
        />
      </View>
    );
  }

  /** 渲染场景DIY界面 */
  renderDiyPanel = () => {
    return (
      <View style={{ paddingTop: cx(32) }}>
        {this.renderTitle('Color Flash Mode')}
        {this.renderFlashModeBase()}
        {/*this.renderFlashModeMore()*/}
        {this.renderColorsTitle()}
        {this.renderLights()}
        {this.renderColors(LIGHT_ID.UP)}
        {this.renderColors(LIGHT_ID.DOWN)}
        {this.renderColors(LIGHT_ID.SYNC)}
        {this.renderBlinkRate()}
      </View>
    );
  }

  render() {
    const { index } = this.state;
    return (
      <View style={{ width: '100%' }}>
        {this.renderDiyItems()}
        {index >= 0 && this.renderDiyPanel()}
      </View>
    );
  }
}

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
  itemView:{
    width: ITEM_VIEW_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ITEM_MARING_BOTTOM,
  },
  itemImage: {
    width: ITEM_IMAGE_SIZE - 4,
    height: ITEM_IMAGE_SIZE - 4,
    borderRadius: ITEM_IMAGE_SIZE * 0.5 - 2,
  },
  itemText: {
    marginTop: ITEM_TEXT_MARGIN_TOP,
    fontSize: ITEM_FONT_SIZE,
    color: '#020914',
  },
  itemTextActive: {
    marginTop: ITEM_TEXT_MARGIN_TOP,
    fontSize: ITEM_FONT_SIZE,
    color: '#00AD3C',
  },
  iconTouch: {
    width: ITEM_IMAGE_SIZE,
    height: ITEM_IMAGE_SIZE,
    borderRadius: ITEM_IMAGE_SIZE * 0.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconActive: {
    backgroundColor: '#00AD3C',
  },
  btns_panel: {
    width: '30%',
    flexDirection: 'row',
  },
  btns_panel_cancel: {
    width: '40%',
    flexDirection: 'row',
  },
  btn_left: {
    width: '50%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  btn_right: {
    width: '50%',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  btn_center: {
    borderRightWidth: 1,
    borderRightColor: '#DADADA',
  },
  btn_text_confirm: {
    fontSize: cx(14),
    color: '#000',
  },
  btn_text_delete: {
    fontSize: cx(14),
    color: '#FF3F33',
  },
  btn_text_add: {
    fontSize: cx(14),
    color: '#00AD3C',
  },
});

export default withTheme(SceneDiy);