import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes } from 'react-native';
import { Toast, IconFont, TYSdk, Utils, TYListItem} from 'tuya-panel-kit';
import icons from '../../res/iconfont';

const TYEvent = TYSdk.event;

const { convertX: cx } = Utils.RatioUtils;

class GlobalToast extends React.PureComponent {
  static propTypes = {
    /**
     * 提示文字
     */
    text: PropTypes.string,
    /**
     * 图标大小
     */
    size: PropTypes.number,
    /**
     * 图标路径
     */
    d: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    /**
     * 图标样式
     */
    iconfontStyle: ViewPropTypes.style,
    /**
     * 内容样式
     */
    contentStyle: ViewPropTypes.style,
    /**
     * 显示位置
     */
    showPosition: PropTypes.string,
    /**
     * 图标颜色
     */
    color: PropTypes.string,
    /**
     * 是否显示图标
     * @version 2.0.0-rc.6
     */
    showIcon: PropTypes.bool,
  };

  static defaultProps = {
    text: '成功文案',
    size: cx(42),
    d: icons.add,
    iconfontStyle: null,
    contentStyle: {},
    showPosition: 'center',
    color: '#fff',
    showIcon: true,
  };

  render() {
    const {
      text,
      contentStyle,
      showPosition,
      color,
      d,
      size,
      iconfontStyle,
      showIcon,
      ...props
    } = this.props;
    const toastPropNames = Object.keys(Toast.propTypes);
    const toastProps = TYListItem.pick(props, toastPropNames);
    const iconProps = TYListItem.omit(props, toastPropNames);
    return (
      <Toast
        {...toastProps}
        text={text}
        showPosition={showPosition}
        contentStyle={[
          showIcon && {
            paddingVertical: cx(18),
            backgroundColor: 'rgba(0,0,0,.7)',
            borderRadius: cx(12),
            paddingHorizontal: cx(18),
          },
          contentStyle,
        ]}
      >
        {showIcon && (
          <IconFont {...iconProps} d={d} size={size} color={color} style={iconfontStyle} />
        )}
      </Toast>
    );
  }
}
export default GlobalToast;

GlobalToast.show = props => {
  TYEvent.emit('showToast', { show: true, ...props });
};

GlobalToast.hide = () => {
  TYEvent.emit('hideToast', { show: false });
};
