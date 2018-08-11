import {localData} from '../services/DataService';
import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';
import GrowthChart from '../components/GrowthChart';
import Container from '../components/Container';

// Keep this here rather than in components/GrowthChart because otherwise I
// think it would load these up twice, because we are including two GrowthCharts
// for weight and weight
const boysWeightData = require('../growthchartdata/boys_weights.json');
const girlsWeightData = require('../growthchartdata/girls_weights.json');
const boysHeightData = require('../growthchartdata/boys_heights.json');
const girlsHeightData = require('../growthchartdata/girls_heights.json');

const infantBoysWeightData = require('../growthchartdata/infant_boys_weights.json');
const infantGirlsWeightData = require('../growthchartdata/infant_girls_weights.json');
const infantBoysHeightData = require('../growthchartdata/infant_boys_heights.json');
const infantGirlsHeightData = require('../growthchartdata/infant_girls_heights.json');

// Before navigating to GrowthChartScreen, set loading to be true because it
// takes a little time to load
class GrowthChartScreen extends Component<{}> {
  /*
   * Redux Props:
   * currentPatientKey
   */
  constructor(props) {
    super(props);
    this.state = {
      patient: null,
      weightData: [],
      heightData: []
    };
  }

  extractData(data) {
    const arr = [];
    arr.push({ color: 'red', unit: '%', values: data['P3']});
    arr.push({ color: 'orange', unit: '%', values: data['P5']});
    arr.push({ color: 'purple', unit: '%', values: data['P10']});
    arr.push({ color: 'green', unit: '%', values: data['P25']});
    arr.push({ color: 'blue', unit: '%', values: data['P50']});
    arr.push({ color: 'purple', unit: '%', values: data['P75']});
    arr.push({ color: 'orange', unit: '%', values: data['P90']});
    arr.push({ color: 'red', unit: '%', values: data['P95']});
    return arr;
  }

  loadPatient = () => {
    let patient = {};
    try {
      patient = localData.getPatient(this.props.currentPatientKey);
    } catch(err) {
      this.props.setErrorMessage(err.message);
      this.props.setLoading(false);
      return;
    }

    let weightData, heightData;
    if (patient.isMale && patient.isInfant) {
      weightData = this.extractData(infantBoysWeightData);
      heightData = this.extractData(infantBoysHeightData);
    } 
    else if (patient.isMale && !patient.isInfant) {
      weightData = this.extractData(boysWeightData);
      heightData = this.extractData(boysHeightData);
    } 
    else if (!patient.isMale && patient.isInfant) {
      weightData = this.extractData(infantGirlsWeightData);
      heightData = this.extractData(infantGirlsHeightData);
    }
    else if (!patient.isMale && !patient.isInfant) {
      weightData = this.extractData(girlsWeightData);
      heightData = this.extractData(girlsHeightData);
    }
    
    const growthChartData = patient.growthChartData;
    weightData.push({ color: 'black', unit: '%', values: growthChartData.weights});
    heightData.push({ color: 'black', unit: '%', values: growthChartData.heights});

    this.setState({patient: patient, weightData: weightData, heightData: heightData});
    this.props.setLoading(false);
  }

  componentDidMount() {
    this.loadPatient();
  }

  render() {
    if (!this.state.patient) {
      return (
        <Container>
          <Text style={styles.title}>Growth Chart</Text>
          <Text>No patient exists</Text>
        </Container>
      );
    }

    return (
      <Container>
        <Text style={styles.title}>Growth Charts</Text>

        <View style={styles.plotsContainer}>
          <View style={styles.chartContainer}>
            <GrowthChart
              data={this.state.weightData}
              isInfant={this.state.patient.isInfant}
              isMale={this.state.patient.isMale}
              isWeight={true}
            />
          </View>

          <View style={styles.chartContainer}>
            <GrowthChart
              data={this.state.heightData}
              isInfant={this.state.patient.isInfant}
              isMale={this.state.patient.isMale}
              isWeight={false}
            />
          </View>
        </View>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  plotsContainer: {
    margin: 8,
    width: '100%'
  },
  chartContainer: {
    margin: 4,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});

// Redux
import { setLoading, setErrorMessage } from '../reduxActions/containerActions';
import { connect } from 'react-redux';

const mapStateToProps = state => ({
  currentPatientKey: state.currentPatientKey
});

const mapDispatchToProps = dispatch => ({
  setLoading: val => dispatch(setLoading(val)),
  setErrorMessage: val => dispatch(setErrorMessage(val))
});

export default connect(mapStateToProps, mapDispatchToProps)(GrowthChartScreen);
