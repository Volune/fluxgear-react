# 'fluxgear-react'

Bind React components to FluxGear engine.

Part of the `fluxgear` project

## Example

```
const StatelessButton = ({ onClick }) => (
  <button type="button" onClick={onClick}>Click Me</button>);
StatelessButton.propTypes = { onClick: PropTypes.func };
const ConnectedButton = connect({
  mapEventsToProps({ dispatch }) {
    return {
      onClick(event) {
        expect(event).to.be.truthy();
        expect(event.currentTarget).to.be.truthy();
        dispatch({ type: ON_CLICK });
      },
    };
  },
});

const StatelessComponent = ({ doubleCounter }) => (<div><ConnectedButton />{doubleCounter}</div>);
StatelessComponent.propTypes = { doubleCounter: PropTypes.number };
const AssembledComponent = assemble({
  engineFactory() {
    return createEngine(/* ... */);
  },
  mapStateToProps(state) {
    return {
      doubleCounter: state.counter * 2,
    };
  },
})(StatelessComponent);
```

## Documentation

### `assemble`

`assemble` binds an engine with a stateless component, and provides the engine to
all the component's children.
(The engine is not provided to the children passed as property.)

Options:
- `engineFactory(engineOptions)` mandatory function to return the engine
- `mapStateToProps(state)` function returning properties to give to the stateless component
- `mapEventsToProps({ dispatch, getEmitterProps })` function returning callback properties to give to the stateless component

### `connect`

`connect` binds the engine of a parent assembled component with a stateless component.

Options:
- `mapStateToProps(state)` function returning properties to give to the stateless component
- `mapEventsToProps({ dispatch, getEmitterProps })` function returning callback properties to give to the stateless component

