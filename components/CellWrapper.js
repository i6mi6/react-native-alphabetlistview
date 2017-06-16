'use strict';

var React = require('react');
var ReactNative = require('react-native');
var {Component, PropTypes} = React;
var {View} = ReactNative;

class CellWrapper extends Component {

  componentDidMount() {
    this.props.updateTag && this.props.updateTag(ReactNative.findNodeHandle(this.refs.view), this.props.sectionId);
  }

  render() {
    var Cell = this.props.component;
    return (
      <View ref='view'>
        <Cell {...this.props} />
      </View>
    );
  }
}

CellWrapper.propTypes = {

  /**
   * The id of the section
   */
  sectionId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]),

  /**
   * A component to render for each cell
   */
  component: PropTypes.func.isRequired,

  /**
   * A function used to propagate the root nodes handle back to the parent
   */
  updateTag: PropTypes.func

};


module.exports = CellWrapper;
