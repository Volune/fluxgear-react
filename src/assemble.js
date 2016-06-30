import React, { Children, Component, PropTypes } from 'react';
import Provider from './Provider';
import { engineType } from './propTypes';
import { ensureIsFunction } from './helpers';
import { ENGINE_KEY } from './constants';

const DEFAULT_MERGE_PROPS = (stateProps, callbackProps, apiProps, engine) =>
  (Object.assign({ engine }, apiProps, stateProps, callbackProps));

const DEFAULT_MERGE_DEPENDENCIES = (providedDependencies, apiDependencies) =>
  (Object.assign({}, providedDependencies, apiDependencies));

const RETURN_NO_PROPS = () => ({});
const RETURN_NO_METHODS = () => ({});
const RETURN_NO_DEPENDENCIES = () => ({});

const getDisplayName = (WrappedComponent) =>
  (WrappedComponent.displayName || WrappedComponent.name || 'Component');

export default function assemble(
  {
    engineFactory,
    mapStateToProps = RETURN_NO_PROPS,
    mapEventsToProps = RETURN_NO_PROPS,
    mapEventsToApi = RETURN_NO_METHODS,
    provideDependencies = RETURN_NO_DEPENDENCIES,
    mapApiToDependencies = RETURN_NO_DEPENDENCIES,
    mergeProps = DEFAULT_MERGE_PROPS,
    mergeDependencies = DEFAULT_MERGE_DEPENDENCIES,
    disableProvideEngineInContext = false,
    disableForwardParentEngineToChildren = false,
  }
) {
  ensureIsFunction(mapStateToProps, 'mapStateToProps');
  ensureIsFunction(mapEventsToProps, 'mapEventsToProps');
  ensureIsFunction(mapEventsToApi, 'mapEventsToApi');
  ensureIsFunction(provideDependencies, 'provideDependencies');
  ensureIsFunction(mapApiToDependencies, 'mapApiToDependencies');

  return (WrappedComponent) => {
    class AssembledComponent extends Component {
      constructor(props, context) {
        super(props, context);

        this.providedDependencies = provideDependencies();
        const apiDependencies = mapApiToDependencies(props, context);
        this.dependencies = mergeDependencies(this.providedDependencies, apiDependencies);

        const getDependencies = () => (this.dependencies);
        const getApiProps = () => this.props;

        this.engine = engineFactory({
          getDependencies,
          getApiProps,
        }, {
          props,
          context,
        });

        const dispatch = (...args) => this.engine.dispatch(...args);
        const getEmitterProps = () => this.props;

        this.callbackProps = mapEventsToProps({
          dispatch,
          getEmitterProps,
        });

        const state = this.engine.getState();
        const stateProps = mapStateToProps(state, props);
        this.state = mergeProps(stateProps, this.callbackProps, props, this.engine);

        // init members that should not be overridden by mapEventsToMethods
        this.subscription = null;

        const callbackApiMembers = mapEventsToApi({
          dispatch,
          getEmitterProps,
        });
        for (const key of Object.keys(callbackApiMembers)) {
          if (this[key] !== undefined) {
            throw new Error(`Cannot map event to existing member ${key}`);
          }
          this[key] = callbackApiMembers[key];
        }
      }

      getChildContext() {
        if (disableProvideEngineInContext) {
          return {
            [ENGINE_KEY]: this.context ? this.context[ENGINE_KEY] : undefined,
          };
        }
        return {
          [ENGINE_KEY]: this.engine,
        };
      }

      componentDidMount() {
        this.subscription = this.engine.subscribe(this.updatePropsFromState);
      }

      componentWillReceiveProps(newProps, newContext) {
        if (this.props !== newProps) {
          const state = this.engine.getState();
          const stateProps = mapStateToProps(state, newProps);
          this.setState(mergeProps(stateProps, this.callbackProps, newProps, this.engine));
        }
        if (this.props !== newProps || this.context !== newContext) {
          const apiDependencies = mapApiToDependencies(newContext);
          this.dependencies = mergeDependencies(this.providedDependencies, apiDependencies);
        }
      }

      shouldComponentUpdate(nextProps, nextState) {
        return this.state !== nextState;
      }

      componentWillUnmount() {
        this.subscription.unsubscribe();
        this.subscription = null;
      }

      updatePropsFromState = () => {
        const state = this.engine.getState();
        const stateProps = mapStateToProps(state, this.props);
        this.setState(mergeProps(stateProps, this.callbackProps, this.props, this.engine));
      };

      render() {
        const { children, ...mergedProps } = this.state;
        if (!disableProvideEngineInContext
          && !disableForwardParentEngineToChildren
          && Children.count(children) > 0) {
          const providerProps = {
            [ENGINE_KEY]: this.context[ENGINE_KEY],
          };
          return (<WrappedComponent {...mergedProps}>
            <Provider {...providerProps}>{children}</Provider>
          </WrappedComponent>);
        }
        return (<WrappedComponent {...mergedProps} />);
      }
    }

    AssembledComponent.displayName = `FluxGearAssembled(${getDisplayName(WrappedComponent)})`;
    AssembledComponent.contextTypes = {
      [ENGINE_KEY]: PropTypes.any,
    };
    AssembledComponent.childContextTypes = {
      [ENGINE_KEY]: engineType,
    };

    return AssembledComponent;
  };
}
