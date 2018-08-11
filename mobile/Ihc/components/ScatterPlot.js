/* eslint-disable react-native/no-inline-styles */
// Lot of dynamic styles so just leave them inline for now
import React from 'react';
import PropTypes from 'prop-types';

import {
  View,
  Text,
  StyleSheet,
  Dimensions
} from 'react-native';

import Dot from './ScatterPlotComponents/Dot';

const propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string,
      unit: PropTypes.string,
      values: PropTypes.arrayOf(
        PropTypes.arrayOf(
          PropTypes.number
        )
      )

    })
  ), // takes array of series of data (array of arrays of {x, y})
  width: PropTypes.oneOfType([
    PropTypes.number, // by default uses entire width of the device
    PropTypes.string]),
  height: PropTypes.oneOfType([
    PropTypes.number, // by default uses entire height of the device
    PropTypes.string]),
  backgroundColor: PropTypes.string, // 'white' by default
  minY: PropTypes.number.isRequired,
  maxY: PropTypes.number.isRequired,
  minX: PropTypes.number.isRequired,
  maxX: PropTypes.number.isRequired,
  unitX: PropTypes.string,
  unitY: PropTypes.string,
  title: PropTypes.string,
  horizontalLinesAt: PropTypes.arrayOf(PropTypes.number),
  verticalLinesAt: PropTypes.arrayOf(PropTypes.number),
};

const defaultProps = {
  height: Dimensions.get('window').height,
  width: Dimensions.get('window').width,
  backgroundColor: 'white',
  title: '',
  unitX: '',
  unitY: ''
};

const AXIS_MARGIN = 32; // Space for the axis labeling

class ScatterPlot extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      ratioX: undefined,
      ratioY: undefined,
      minX: undefined,
      maxX: undefined,
      minY: undefined,
      maxY: undefined,
      horizontalLinesAt: undefined
    };

    this.chartHeight = this.props.height - AXIS_MARGIN;
    this.chartWidth = this.props.width - AXIS_MARGIN;
  }

  getHorizontalLines = (horizontalLinesAt) => {
    return horizontalLinesAt ?
      horizontalLinesAt.map((line, idx) => {
        return (
          <View
            key={idx}
            style={{
              opacity: .5,
              width: this.chartWidth,
              height: 1,
              backgroundColor: 'gray',
              left: 0,
              bottom: this.getY(line),
              position: 'absolute'
            }}
          >
          </View>
        );
      }) : undefined;
  }

  getVerticalLines(verticalLinesAt) {
    return verticalLinesAt ?
      verticalLinesAt.map((line, idx) => {
        return (
          <View key={idx}
            style={{
              opacity: .5,
              backgroundColor: 'gray',
              width: 1,
              height: this.chartHeight,
              bottom: 0,
              left: this.getX(line),
              position: 'absolute' }} />
        );
      }) : undefined;
  }

  getXAxisLabels(verticalLinesAt) {
    // The vertical axis labels are the months, but display the years
    return verticalLinesAt.map( (xVal,idx) => {
      // Calculate coordinate before transforming xVal
      const leftCoord = this.getX(xVal);

      // Render years instead of months
      if (this.props.unitX === 'years') {
        xVal = xVal / 12;
      }

      return (
        <Text key={`${idx}label`}
          style={{
            fontSize: 8,
            position: 'absolute',
            left: leftCoord}}
        >
          {xVal}
        </Text>
      );
    });
  }

  getYAxisLabels(horizontalLinesAt) {
    return horizontalLinesAt.map( (yVal,idx) => {
      return (
        <Text key={`${idx}label`}
          style={{
            fontSize: 8,
            position: 'absolute',
            bottom: this.getY(yVal)}}
        >
          {yVal}
        </Text>
      );
    });
  }

  render() {
    const { data, height, width, backgroundColor, title, unitY, unitX } = this.props;
    const { horizontalLinesAt, verticalLinesAt } = this.state;
    const { getX, getY } = this;


    const horizontalLines = this.getHorizontalLines(horizontalLinesAt);
    const verticalLines = this.getVerticalLines(verticalLinesAt);

    // y axis marks should be where horizontal lines intersect, and vice
    // versa
    const yAxisLabels = this.getYAxisLabels(horizontalLinesAt);
    const xAxisLabels = this.getXAxisLabels(verticalLinesAt);

    let points = [];

    if (data) {
      for (let i = 0; i < data.length; i++) {
        const dataSeries = data[i];
        for (let j = 0; j < dataSeries.values.length; j++) {
          const point = dataSeries.values[j];
          points.push(<Dot key={`${i}_${j}`} left={getX(point[0])} bottom={getY(point[1])} color={dataSeries.color} />);
        }
      }
    }

    return (
      <View style={{ height: height, width: width, flexDirection: 'column' }}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={{
            alignSelf: 'center',
            height: AXIS_MARGIN/2,
            fontSize: 10,
            transform: [{ rotate: '270deg'}]
          }}>
            {unitY}
          </Text>

          <View style={{ height: this.chartHeight, width: AXIS_MARGIN/2, flexDirection: 'column'}}>
            {yAxisLabels}
          </View>

          <View style={{ height: this.chartHeight, width: this.chartWidth, backgroundColor: backgroundColor }}>
            <Text style={styles.title}>{title}</Text>
            {points}
            {horizontalLines}
            {verticalLines}
          </View>
        </View>

        <View style={{
          flexDirection: 'row',
          alignSelf: 'flex-end',
          height: AXIS_MARGIN/2,
          width: this.chartWidth,
        }}>
          {xAxisLabels}
        </View>

        <Text style={{
          alignSelf: 'center',
          height: AXIS_MARGIN/2,
          fontSize: 10,
        }}>
          {unitX}
        </Text>
      </View>
    );
  }

  componentWillReceiveProps(nextProps) {
    this.computeAxes(nextProps);
  }

  componentWillMount() {
    this.computeAxes(this.props);
  }

  computeAxes = async (props) => {
    const { data, minX, minY, maxX, maxY } = props;
    let { horizontalLinesAt, verticalLinesAt } = props;

    if (!data) { return; }

    horizontalLinesAt || (horizontalLinesAt = []);
    const _horizontalLinesAt = [];
    for (let i = 0; i < horizontalLinesAt.length; i++) {
      const current = horizontalLinesAt[i];
      if (current >= minY && current <= maxY) { _horizontalLinesAt.push(current); }
    }
    horizontalLinesAt = [..._horizontalLinesAt];

    await this.setState({
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      ratioX: this.chartWidth / (maxX - minX),
      ratioY: this.chartHeight / (maxY - minY),
      horizontalLinesAt,
      verticalLinesAt
    });
  }

  getX = v => {
    const { minX, ratioX } = this.state;
    return (v - minX) * ratioX;
  }

  getY = v => {
    const { minY, ratioY } = this.state;
    return (v - minY) * ratioY;
  }

  // return min and max values, not used if min and max props are required
  dataExtremes = () => {
    const { data, minX, minY, maxX, maxY } = this.props;
    let seriesMinX = [], seriesMaxX = [], seriesMinY = [], seriesMaxY = [];
    data.forEach(dataSeries => {
      const xArr = dataSeries.values.map(point => point[0]);
      seriesMinX.push(Math.min.apply(null, xArr));
      seriesMaxX.push(Math.max.apply(null, xArr));
      const yArr = dataSeries.values.map(point => point[1]);
      seriesMinY.push(Math.min.apply(null, yArr));
      seriesMaxY.push(Math.max.apply(null, yArr));
    });
    const _minX = typeof minX !== 'undefined' ?
      Math.min.apply(null, [minX, ...seriesMinX]) : Math.min.apply(null, seriesMinX);
    const _maxX = typeof maxX !== 'undefined' ?
      Math.max.apply(null, [maxX, ...seriesMaxX]) : Math.max.apply(null, seriesMaxX);
    const _minY = typeof minY !== 'undefined' ?
      Math.min.apply(null, [minY, ...seriesMinY]) : Math.min.apply(null, seriesMinY);
    const _maxY = typeof maxY !== 'undefined' ?
      Math.max.apply(null, [maxY, ...seriesMaxY]) : Math.max.apply(null, seriesMaxY);
    const obj = { minX: _minX, maxX: _maxX, minY: _minY, maxY: _maxY };
    return obj;
  }
}

const styles = StyleSheet.create({
  title: {
    margin: 4,
  },
});

ScatterPlot.propTypes = propTypes;
ScatterPlot.defaultProps = defaultProps;
export default ScatterPlot;
/* eslint-enable react-native/no-inline-styles */
