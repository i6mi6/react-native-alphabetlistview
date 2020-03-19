'use strict';
/* jshint esnext: true */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactNative, {
  FlatList,
  SectionList as RNSectionList,
  StyleSheet,
  View,
  NativeModules,
} from 'react-native';
import merge from 'merge';

import SectionHeader from './SectionHeader';
import SectionList from './SectionList';
import CellWrapper from './CellWrapper';

const { UIManager } = NativeModules;

export default class SelectableSectionsListView extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      offsetY: 0
    };

    this.renderFooter = this.renderFooter.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.renderSectionHeader = this.renderSectionHeader.bind(this);

    this.onScroll = this.onScroll.bind(this);
    this.onScrollAnimationEnd = this.onScrollAnimationEnd.bind(this);
    this.scrollToSection = this.scrollToSection.bind(this);

    // used for dynamic scrolling
    // always the first cell of a section keyed by section id
    this.cellTagMap = {};
    this.sectionTagMap = {};
    this.updateTagInCellMap = this.updateTagInCellMap.bind(this);
    this.updateTagInSectionMap = this.updateTagInSectionMap.bind(this);
  }

  componentWillMount() {
    this.calculateTotalHeight();
  }

  componentDidMount() {
    // push measuring into the next tick
    setTimeout(() => {
      UIManager.measure(ReactNative.findNodeHandle(this.refs.view), (x,y,w,h) => {
        this.containerHeight = h;
        if (this.props.contentInset && this.props.data && this.props.data.length > 0) {
          this.scrollToSection(Object.keys(this.props.data)[0]);
        }
      });
    }, 0);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.data && nextProps.data !== this.props.data) {
      this.calculateTotalHeight(nextProps.data);
    }
  }

  calculateTotalHeight(data) {
    data = data || this.props.data;

    if (Array.isArray(data)) {
      return;
    }

    this.sectionItemCount = {};
    this.totalHeight = Object.keys(data)
      .reduce((carry, key) => {
        var itemCount = data[key].length;
        carry += itemCount * this.props.cellHeight;
        carry += this.props.sectionHeaderHeight;

        this.sectionItemCount[key] = itemCount;

        return carry;
      }, 0);
  }

  updateTagInSectionMap(tag, section) {
    this.sectionTagMap[section] = tag;
  }

  updateTagInCellMap(tag, section) {
    this.cellTagMap[section] = tag;
  }

  convertDataToSections(data) {
    return Object.keys(data).map(key => ({ data: data[key], key })).filter(d => d.data.length);
  }

  scrollToSection(section) {
    try {
      const { data } = this.props;
      const letterIndex = Object.keys(data).indexOf(section);

      if (letterIndex > -1 && Object.values(data)[letterIndex].length) {
        const sections = this.convertDataToSections(data);
        const sectionsMap = Object.values(sections).map(s => s.key);
        const sectionIndex = sectionsMap.indexOf(section);

        this.refs.listview.scrollToLocation({ animated: true, itemIndex: 0, sectionIndex });
      }

      this.props.onScrollToSection && this.props.onScrollToSection(section);
    } catch (e) {
      console.warn(e.toString(), e);
    }
  }

  // renderSectionHeader(sectionData, sectionId) {
  renderSectionHeader({ section }) {
    const sectionData = section.data;
    const sectionId = section.key;

    const updateTag = this.props.useDynamicHeights ?
      this.updateTagInSectionMap :
      null;

    const title = this.props.getSectionTitle ?
      this.props.getSectionTitle(sectionId) :
      sectionId;

    return (
      <SectionHeader
        component={this.props.sectionHeader}
        title={title}
        sectionId={sectionId}
        sectionData={sectionData}
        updateTag={updateTag}
      />
    );
  }

  renderFooter() {
    const Footer = this.props.footer;
    return <Footer />;
  }

  renderHeader() {
    const Header = this.props.header;
    return <Header />;
  }

  // renderRow(item, sectionId, index) {
  renderItem({ item, index }) {
    const CellComponent = this.props.cell;
    index = parseInt(index, 10);

    const isFirst = index === 0;
    // const isLast = this.sectionItemCount && this.sectionItemCount[sectionId]-1 === index;

    const props = {
      isFirst,
      // isLast,
      // sectionId,
      index,
      item,
      offsetY: this.state.offsetY,
      onSelect: this.props.onCellSelect
    };

    return index === 0 && this.props.useDynamicHeights ?
      <CellWrapper
        updateTag={this.updateTagInCellMap}
        component={CellComponent} {...props} {...this.props.cellProps} /> :
      <CellComponent {...props} {...this.props.cellProps} />;
  }

  onScroll(e) {
    const offsetY = e.nativeEvent.contentOffset.y;
    if (this.props.updateScrollState) {
      this.setState({
        offsetY
      });
    }

    this.props.onScroll && this.props.onScroll(e);
  }

  onScrollAnimationEnd(e) {
    if (this.props.updateScrollState) {
      this.setState({
        offsetY: e.nativeEvent.contentOffset.y
      });
    }
  }

  render() {
    const { data } = this.props;
    const dataIsArray = Array.isArray(data);
    let sectionList;
    let renderSectionHeader;
    let sections = Object.keys(data);
    const ListComponent = dataIsArray ? FlatList : RNSectionList;

    if (typeof(this.props.compareFunction) === "function") {
      sections = sections.sort(this.props.compareFunction);
    }

    if (!dataIsArray) {
      sectionList = !this.props.hideSectionList ?
        <SectionList
          style={this.props.sectionListStyle}
          onSectionSelect={this.scrollToSection}
          sections={sections}
          data={data}
          getSectionListTitle={this.props.getSectionListTitle}
          component={this.props.sectionListItem}
          fontStyle={this.props.sectionListFontStyle}
          wrapperStyle={this.props.sectionListWrapperStyle}
          showLetter={this.props.showLetter}
          letterLabelStyle={this.props.letterLabelStyle}
          letterLabelFontStyle={this.props.letterLabelFontStyle}
          mainColor={this.props.mainColor}
          reversedColor={this.props.reversedColor}
          renderLetterLabelText={this.props.renderLetterLabelText}
        /> :
        null;

      renderSectionHeader = this.renderSectionHeader;
    }

    const renderFooter = this.props.footer ?
      this.renderFooter :
      this.props.renderFooter;

    const renderHeader = this.props.header ?
      this.renderHeader :
      this.props.renderHeader;

    const props = merge({}, this.props, {
      onScroll: this.onScroll,
      onScrollAnimationEnd: this.onScrollAnimationEnd,
      data,
      sections: this.convertDataToSections(data),
      renderFooter,
      renderHeader,
      renderItem: this.renderItem,
      renderSectionHeader
    });

    props.style = void 0;

    return (
      <View ref="view" style={[styles.container, this.props.style]}>
        <ListComponent
          ref="listview"
          {...props}
        />
        {sectionList}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

const stylesheetProp = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.object,
]);

SelectableSectionsListView.propTypes = {
  /**
   * The data to render in the listview
   */
  data: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,

  /**
   * Whether to show the section listing or not
   */
  hideSectionList: PropTypes.bool,

  /**
   * Functions to provide a title for the section header and the section list
   * items. If not provided, the section ids will be used (the keys from the data object)
   */
  getSectionTitle: PropTypes.func,
  getSectionListTitle: PropTypes.func,

  /**
   * Function to sort sections. If not provided, the sections order will match data source
   */
  compareFunction: PropTypes.func,

  /**
   * Callback which should be called when a cell has been selected
   */
  onCellSelect: PropTypes.func,

  /**
   * Callback which should be called when the user scrolls to a section
   */
  onScrollToSection: PropTypes.func,

  /**
   * The cell element to render for each row
   */
  cell: PropTypes.func.isRequired,

  /**
   * A custom element to render for each section list item
   */
  sectionListItem: PropTypes.func,

  /**
   * A custom element to render for each section header
   */
  sectionHeader: PropTypes.func,

  /**
   * A custom element to render as footer
   */
  footer: PropTypes.func,

  /**
   * A custom element to render as header
   */
  header: PropTypes.func,

  /**
   * The height of the header element to render. Is required if a
   * header element is used, so the positions can be calculated correctly
   */
  headerHeight: PropTypes.number,

  /**
   * A custom function to render as footer
   */
  renderHeader: PropTypes.func,

  /**
   * A custom function to render as header
   */
  renderFooter: PropTypes.func,

  /**
   * An object containing additional props, which will be passed
   * to each cell component
   */
  cellProps: PropTypes.object,

  /**
   * The height of the section header component
   */
  sectionHeaderHeight: PropTypes.number.isRequired,

  /**
   * The height of the cell component
   */
  cellHeight: PropTypes.number.isRequired,

  /**
   * Whether to determine the y postion to scroll to by calculating header and
   * cell heights or by using the UIManager to measure the position of the
   * destination element. This is an exterimental feature
   */
  useDynamicHeights: PropTypes.bool,

  /**
   * Whether to set the current y offset as state and pass it to each
   * cell during re-rendering
   */
  updateScrollState: PropTypes.bool,

  /**
   * Styles to pass to the container
   */
  style: stylesheetProp,

  /**
   * Styles to pass to the section list container
   */
  sectionListStyle: stylesheetProp,

  /**
   * Selector styles
   */
  sectionListFontStyle: stylesheetProp,

  // TODO: Add description to new props
  showLetter: PropTypes.bool,
  letterLabelStyle: stylesheetProp,
  letterLabelFontStyle: stylesheetProp,
  mainColor: PropTypes.string,
  reversedColor: PropTypes.string,
  renderLetterLabelText: PropTypes.func,
};

SectionList.defaultProps = {
  letterLabelStyle: {},
  letterLabelFontStyle: {},
  mainColor: '#008fff',
  reversedColor: 'white',
};
