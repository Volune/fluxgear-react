import React, { Component, PropTypes } from 'react';
import { engineType } from './propTypes';
import { ENGINE_KEY } from './constants';

export default class Provider extends Component {
  getChildContext() {
    return {
      [ENGINE_KEY]: this.props[ENGINE_KEY],
    };
  }

  render() {
    return (<div>{this.props.children}</div>);
  }
}

Provider.propTypes = {
  children: PropTypes.node,
  [ENGINE_KEY]: engineType,
};

Provider.childContextTypes = {
  [ENGINE_KEY]: engineType,
};
