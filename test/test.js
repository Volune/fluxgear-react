import 'jsdom-global-on-import';
import React, { PropTypes } from 'react';
import { assemble, connect } from '../src';
import { ENGINE_KEY } from '../src/constants';
import { engineType } from '../src/propTypes';
import { mount } from 'enzyme';
import expect from 'must';
import sinon from 'sinon';
import mustSinon from 'must-sinon';
mustSinon(expect);

const ON_CLICK = 'ON_CLICK';

const Span = ({ value }) => (<span>{value}</span>);
Span.propTypes = { value: PropTypes.any };
const Button = ({ onClick }) => (<button type="button" onClick={onClick}>Test</button>);
Button.propTypes = { onClick: PropTypes.func };
const Div = ({ children }) => (<div>{children}</div>);
Div.propTypes = { children: PropTypes.node };

const createSimpleEngine = () => {
  const initialState = { date: Date.now() };
  const listeners = [];
  const subscription = {
    unsubscribe() {
    },
  };
  sinon.spy(subscription, 'unsubscribe');
  const engine = {
    dispatch() {
    },
    getState() {
      return this.state;
    },
    subscribe(listener) {
      listeners.push(listener);
      return subscription;
    },
    initialState,
    state: initialState,
    listeners,
    subscription,
  };
  sinon.spy(engine, 'dispatch');
  sinon.spy(engine, 'getState');
  sinon.spy(engine, 'subscribe');
  return engine;
};

describe('assemble', () => {
  it('mounts and unmounts', () => {
    const engine = createSimpleEngine();
    const Component = assemble({
      engineFactory() {
        return engine;
      },
    })(Span);
    const wrapper = mount(<Component />);
    expect(engine.subscribe).to.have.been.calledOnce();
    wrapper.unmount();
    expect(engine.subscription.unsubscribe).to.have.been.calledOnce();
  });
  it('shows state value and updates', () => {
    const engine = createSimpleEngine();
    const Component = assemble({
      engineFactory() {
        return engine;
      },
      mapStateToProps(state) {
        return {
          value: state.date,
        };
      },
    })(Span);
    const wrapper = mount(<Component />);
    expect(wrapper.text()).to.equal(String(engine.initialState.date));
    engine.state = { date: engine.initialState.date + 500 };
    engine.listeners.forEach(listener => listener());
    expect(wrapper.text()).to.equal(String(engine.state.date));
  });
  it('dispatch event on DOM event', () => {
    const engine = createSimpleEngine();
    const Component = assemble({
      engineFactory() {
        return engine;
      },
      mapEventsToProps({ dispatch }) {
        return {
          onClick(event) {
            expect(event).to.be.truthy();
            expect(event.currentTarget).to.be.truthy();
            dispatch({ type: ON_CLICK });
          },
        };
      },
    })(Button);
    const wrapper = mount(<Component />);
    wrapper.simulate('click');
    expect(engine.dispatch).to.have.been.calledWith(sinon.match({ type: ON_CLICK }));
  });
});

describe('connect', () => {
  it('mounts and unmounts', () => {
    const engine = createSimpleEngine();
    const Component = connect({})(Span);
    const Container = assemble({
      engineFactory() {
        return engine;
      },
    })(() => (<div><Component /></div>));
    const wrapper = mount(<Container />);
    expect(engine.subscribe).to.have.been.calledTwice();
    wrapper.unmount();
    expect(engine.subscription.unsubscribe).to.have.been.calledTwice();
  });
  it('shows state value and updates', () => {
    const engine = createSimpleEngine();
    const Component = connect({
      mapStateToProps(state) {
        return {
          value: state.date,
        };
      },
    })(Span);
    const Container = assemble({
      engineFactory() {
        return engine;
      },
    })(() => (<div><Component /></div>));
    const wrapper = mount(<Container />);
    expect(wrapper.text()).to.equal(String(engine.initialState.date));
    engine.state = { date: engine.initialState.date + 500 };
    engine.listeners.forEach(listener => listener());
    expect(wrapper.text()).to.equal(String(engine.state.date));
  });
  it('dispatch event on DOM event', () => {
    const engine = createSimpleEngine();
    const Component = connect({
      mapEventsToProps({ dispatch }) {
        return {
          onClick(event) {
            expect(event).to.be.truthy();
            expect(event.currentTarget).to.be.truthy();
            dispatch({ type: ON_CLICK });
          },
        };
      },
    })(Button);
    const Container = assemble({
      engineFactory() {
        return engine;
      },
    })(() => (<div><Component /></div>));
    const wrapper = mount(<Container />);
    wrapper.find(Button).simulate('click');
    expect(engine.dispatch).to.have.been.calledWith(sinon.match({ type: ON_CLICK }));
  });
});

describe('component with provided children', () => {
  it('mounts and unmounts', () => {
    const engine = createSimpleEngine();
    const Component = () => (<span>Child</span>);
    Component.contextTypes = { [ENGINE_KEY]: engineType };
    const Container = assemble({
      engineFactory() {
        return engine;
      },
    })(Div);
    const wrapper = mount(<Container ><Component /></Container>);
    expect(engine.subscribe).to.have.been.calledOnce();
    expect(wrapper.find(Component).node.context[ENGINE_KEY]).to.be.falsy();
    wrapper.unmount();
    expect(engine.subscription.unsubscribe).to.have.been.calledOnce();
    const fakeEngine = {};
    const wrapper2 = mount(<Container ><Component /></Container>, {
      context: { [ENGINE_KEY]: fakeEngine },
    });
    expect(wrapper2.find(Component).node.context[ENGINE_KEY]).to.equal(fakeEngine);
  });
});
