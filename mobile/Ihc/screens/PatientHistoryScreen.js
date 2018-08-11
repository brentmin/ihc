import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Col, Grid } from 'react-native-easy-grid';
import {localData} from '../services/DataService';
import {formatDate} from '../util/Date';
import {shortDate} from '../util/Date';
import Container from '../components/Container';
import Button from '../components/Button';
import {downstreamSyncWithServer} from '../util/Sync';

/* TODO:
 * Make changes in behavior for the cases that a soap form is submitted,
 * but not a triage form and vice versa
*/

class PatientHistoryScreen extends Component<{}> {
  /*
   * Expects:
   *  {
   *    name: string, patient's name (for convenience)
   *  }
   */
  constructor(props) {
    super(props);
    this.state = {
      patient: null,
    };
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
  }

  syncAndLoadPatient = () => {
    this.props.setLoading(true);
    this.props.clearMessages();

    try {
      const patient = localData.getPatient(this.props.currentPatientKey);
      this.setState({ patient: patient });
    } catch(err) {
      this.props.setLoading(false);
      this.props.setErrorMessage(err.message);
      return;
    }

    downstreamSyncWithServer()
      .then( (failedPatientKeys) => {
        if (this.props.loading) {
          if (failedPatientKeys.length > 0) {
            throw new Error(`${failedPatientKeys.length} patients didn't properly sync.`);
          }

          try {
            const patient = localData.getPatient(this.props.currentPatientKey);
            this.props.setLoading(false);
            this.setState({ patient: patient });
          } catch(err) {
            this.props.setLoading(false);
            this.props.setErrorMessage(err.message);
            return;
          }

          this.props.setLoading(false);
        }
      })
      .catch( (err) => {
        if (this.props.loading) {
          this.props.setErrorMessage(err.message);
          this.props.setLoading(false);
        }
      });
  }

  onNavigatorEvent(event) {
    if (event.id === 'willAppear') {
      this.syncAndLoadPatient();
    }
  }

  // TODO: make Soap and Triage screen read patient key from redux
  goToSoap(date) {
    this.props.navigator.push({
      screen: 'Ihc.SoapScreen',
      title: 'Back to patient',
      passProps: { name: this.props.name, todayDate: date }
    });
  }

  goToTriage(date) {
    this.props.navigator.push({
      screen: 'Ihc.TriageScreen',
      title: 'Back to patient',
      passProps: { todayDate: date }
    });
  }

  //TODO: triage won't always align with correct dates and fix spacing issue for dates
  render() {
    if (this.state.patient == null) {
      return (
        <Container>
          <Text style={styles.title}>
            Previous Visits
          </Text>
          <Text>Patient doesnt exist...</Text>
        </Container>
      );
    }

    return (
      <Container>

        <Text style={styles.title}>
          Previous Visits
        </Text>

        <View style={styles.gridContainer}>
          <Grid>
            <Col style={styles.col}>
              {this.state.patient.soaps.map( (soap, i) =>
                <Text key={i} style={styles.dateContainer}>{formatDate(new Date(shortDate(soap.date)))}</Text> )}
            </Col>

            <Col style={styles.col}>
              {this.state.patient.soaps.map( (soap, i) =>
                <Button key={i}
                  onPress={() => this.goToSoap(soap.date)}
                  text='SOAP' />
              )}
            </Col>

            <Col style={styles.col}>
              {this.state.patient.triages.map( (triage, i) =>
                <Button key={i}
                  onPress={() => this.goToTriage(triage.date)}
                  text='Triage' />
              )}
            </Col>
          </Grid>
        </View>
      </Container>
    );
  }
}
const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    maxWidth: '80%',
    alignItems: 'center',
  },
  col: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 5,
  },
  dateContainer: {
    width: 150,
    margin: 10,
    padding: 8,
    elevation: 4,
  },
});

// Redux
import { setLoading, setSuccessMessage, setErrorMessage, clearMessages } from '../reduxActions/containerActions';
import { connect } from 'react-redux';

const mapStateToProps = state => ({
  loading: state.loading,
  currentPatientKey: state.currentPatientKey
});

const mapDispatchToProps = dispatch => ({
  setLoading: (val,showRetryButton) => dispatch(setLoading(val, showRetryButton)),
  setSuccessMessage: val => dispatch(setSuccessMessage(val)),
  setErrorMessage: val => dispatch(setErrorMessage(val)),
  clearMessages: () => dispatch(clearMessages())
});

export default connect(mapStateToProps, mapDispatchToProps)(PatientHistoryScreen);
