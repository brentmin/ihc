/*
 * Display the Scatterplots for growthcharts, and the legend and axis info
 * Width and height fill up entire parent
 */
import React, { Component } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ScatterPlot from './ScatterPlot';
import Dot from './ScatterPlotComponents/Dot';

export default class GrowthChart extends Component<{}> {
  /*
   * Parent props:
   * isInfant: boolean
   * isMale: boolean
   * isWeight: boolean, false if height data
   * data: array of [{color: '<color>', unit: '%', values: [[MONTH,weight/height]]}]
   */
  constructor(props) {
    super(props);

    this.minAgeMonths = this.props.isInfant ? 0 : 24;
    this.maxAgeMonths = this.props.isInfant ? 26 : 245;
    this.maxHeight = this.props.isInfant ? 105 : 200;
    this.maxWeight = this.props.isInfant ? 20 : 125;
    this.maxY = this.props.isWeight ? this.maxWeight : this.maxHeight;

    // Mark every 2 yrs (24 months) for youth, every 4 months for infants, starting from the
    // minAgeMonths
    const monthMark = this.props.isInfant ? 4 : 24;
    this.linesMonth = Array.from({length: Math.ceil((this.maxAgeMonths-this.minAgeMonths) / monthMark)}, (v,i) => i * monthMark + this.minAgeMonths);

    // Mark every 25 cm for youth, and every 10 cm for infants
    const cmMark = this.props.isInfant ? 10 : 25;
    this.linesCm = Array.from({length: Math.ceil(this.maxHeight / cmMark)}, (v,i) => i * cmMark);

    // Mark every 10 kg for youth, and every 5 kg for infants
    const kgMark = this.props.isInfant ? 5 : 10;
    this.linesKg = Array.from({length: Math.ceil(this.maxWeight / kgMark)}, (v,i) => i * kgMark);

    this.horizontalLines = this.props.isWeight ? this.linesKg : this.linesCm;

    // Can't make these constants because chartWidth depends on calculation
    this.chartHeight = 500;
    this.chartWidth = Dimensions.get('window').width * .9;

    this.title = this.props.isWeight ? 'Weight Growth Chart' : 'Height Growth Chart';
    this.unitY = this.props.isWeight ? 'kg' : 'cm';

    // Data behind the scenes is treated as months, but we want to render it
    // more clearly so if the patient is not an infant, display it as years
    this.unitX = this.props.isInfant ? 'months' : 'years';


    // Info to be used in the graph legend
    const labelPairs = [['black', 'Patient'], ['red', 'P3'], ['orange', 'P5'],
      ['purple', 'P10'],
      ['green', 'P25'], ['blue', 'P50'], ['purple', 'P75'], ['orange', 'P90'],
      ['red', 'P95']].reverse();

    this.dotLabels = labelPairs.map( pair => {
      return (
        <View key={`${pair[0]}${pair[1]}`} style={styles.dotLabelContainer}>
          <Dot position="relative" bottom={-4} color={pair[0]} />
          <Text style={styles.dotLabel}>{pair[1]}</Text>
        </View>
      );
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text>{this.title}</Text>

        <View style={styles.legend}>
          {this.dotLabels}
        </View>

        <ScatterPlot
          height={this.chartHeight}
          width={this.chartWidth}
          data={this.props.data}
          minX={this.minAgeMonths}
          maxX={this.maxAgeMonths}
          minY={0}
          maxY={this.maxY}
          horizontalLinesAt={this.horizontalLines}
          verticalLinesAt={this.linesMonth}
          unitX={this.unitX}
          unitY={this.unitY} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  legend: {
    flex: 1,
    flexDirection: 'row',
    margin: 4,
  },
  dotLabel: {
    marginLeft: 4,
  },
  dotLabelContainer: {
    margin: 4,
    width: 50,
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
  },

});
