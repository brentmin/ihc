import React, { Component } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {localData, serverData} from '../services/DataService';
import MedicationTable  from '../components/MedicationTable';
import Container from '../components/Container';
import {stringDate} from '../util/Date';
import DrugUpdate from '../models/DrugUpdate';
import Button from '../components/Button';
import {downstreamSyncWithServer} from '../util/Sync';

class MedicationScreen extends Component<{}> {
  /*
   * Redux props:
   * loading: boolean
   * currentPatientKey: string
   *
   * Props:
   * name: patient's name for convenience
   */
  constructor(props) {
    super(props);

    this.state = {
      updates: [],
      medicationCheckmarks: [],
      todayDate: stringDate(new Date()),
    };
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
  }

  // Reload table after new medication updates
  // Replaces componentDidMount() because this will be called around the same
  // time
  onNavigatorEvent(event) {
    if (event.id === 'willAppear') {
      this.syncAndLoadMedications();
    }
  }

  refillMedication = (prevDrugUpdate) => {
    const newUpdate = Object.assign({}, prevDrugUpdate);
    newUpdate.date = this.state.todayDate;

    try {
      localData.updateDrugUpdate(newUpdate);
    } catch(e) {
      this.setState({errorMsg: e.message});
      return;
    }

    this.props.setLoading(true);
    this.props.isUploading(true);

    serverData.updateDrugUpdate(newUpdate)
      .then( () => {
        // View README: Handle syncing the tablet, point 3 for explanation
        if(this.props.loading) {
          // if successful, then reload data
          this.syncAndLoadMedications();

          this.props.setLoading(false);
          this.props.setSuccessMessage('Saved successfully');
        }
      })
      .catch( (e) => {
        if(this.props.loading) {
          localData.markPatientNeedToUpload(this.props.currentPatientKey);

          this.props.setLoading(false, true);
          this.props.setErrorMessage(e.message);
        }
      });
  }

  changeMedication = (prevDrugUpdate) => {
    this.props.navigator.push({
      screen: 'Ihc.MedicationUpdateScreen',
      title: 'Medication',
      passProps: {
        drugUpdate: prevDrugUpdate,
        action: 'change',
        name: this.props.name
      }
    });
  }

  discontinueMedication = (prevDrugUpdate) => {
    // Add a dummy drug update to updates prop
    const newUpdate = DrugUpdate.getDiscontinueDummy(prevDrugUpdate);
    this.setState({
      updates: this.state.updates.concat([newUpdate])
    });
  }

  createNewMedication = () => {
    this.props.navigator.push({
      screen: 'Ihc.MedicationUpdateScreen',
      title: 'Medication',
      passProps: {
        action: 'new',
        patientKey: this.props.patientKey,
        name: this.props.name
      }
    });
  }

  syncAndLoadMedications = () => {
    this.props.setLoading(true);
    this.props.isUploading(false);
    this.props.clearMessages();

    // Load local data in beginning to display even if sync doesn't work
    let updates = localData.getMedicationUpdates(this.props.currentPatientKey);
    let statusObj = localData.getStatus(this.props.currentPatientKey, this.state.todayDate);
    const checkmarks = statusObj.medicationCheckmarks;
    this.setState({
      updates: updates,
      medicationCheckmarks: checkmarks,
    });

    downstreamSyncWithServer()
      .then((failedPatientKeys) => {
        // View README: Handle syncing the tablet, point 3 for explanation
        if(this.props.loading) {
          if(failedPatientKeys.length > 0) {
            throw new Error(`${failedPatientKeys.length} patients didn't properly sync.`);
          }

          let updates = localData.getMedicationUpdates(this.props.currentPatientKey);
          let statusObj = localData.getStatus(this.props.currentPatientKey, this.state.todayDate);
          const checkmarks = statusObj.medicationCheckmarks;

          this.setState({
            updates: updates,
            medicationCheckmarks: checkmarks,
          });
          this.props.setLoading(false);
        }
      })
      .catch(err => {
        if(this.props.loading) {
          this.props.setLoading(false);
          this.props.setErrorMessage(err.message);
        }
      });
  }

  saveCheckmarks = () => {
    // Local checkmark saves are handled in MedicationTable directly.
    const statusObj = localData.getStatus(this.props.currentPatientKey, this.state.todayDate);

    this.props.setLoading(true);
    this.props.clearMessages();

    serverData.updateStatus(statusObj)
      .then( () => {
        // View README: Handle syncing the tablet, point 3 for explanation
        if(this.props.loading) {
          this.props.setSuccessMessage('Saved');
          this.props.setLoading(false);
        }
      })
      .catch( (e) => {
        if(this.props.loading) {
          localData.markPatientNeedToUpload(this.props.currentPatientKey);

          this.props.setErrorMessage(e.message);
          this.props.setLoading(false, true);
        }
      });
  }

  // station: 'Doctor' or 'Pharmacy'
  updateStatus(station) {
    this.props.setLoading(true);
    this.props.clearMessages();

    let statusObj = {};
    if(station !== 'Doctor' && station !== 'Pharmacy') {
      throw new Error(`Received invalid station: ${station}`);
    }

    const fieldName = station === 'Doctor' ? 'doctorCompleted' : 'pharmacyCompleted';
    try {
      statusObj = localData.updateStatus(this.props.currentPatientKey, this.state.todayDate,
        fieldName, new Date().getTime());
    } catch(e) {
      this.props.setLoading(false);
      this.props.setErrorMessage(e.message);
      return;
    }

    serverData.updateStatus(statusObj)
      .then( () => {
        // View README: Handle syncing the tablet, point 3 for explanation
        if(this.props.loading) {
          this.props.setSuccessMessage(`${station} marked as completed`);
          this.props.setLoading(false);
        }
      })
      .catch( (e) => {
        if(this.props.loading) {
          localData.markPatientNeedToUpload(this.props.currentPatientKey);
          this.props.setErrorMessage(e.message);
          this.props.setLoading(false, true);
        }
      });
  }

  // When the doctor has completed prescribing medications, then update the
  // timestamp to be displayed in the PatientSelectScreen so the Pharmacy knows
  // that they can start filling those medications
  completed = () => {
    this.updateStatus('Doctor');
  }

  // When the Pharmacy has completed filling medications, then update the
  // timestamp to be displayed in the PatientSelectScreen so we know
  // that the patient can get their meds
  filled = () => {
    this.updateStatus('Pharmacy');
  }

  render() {
    return (
      <Container>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            {this.props.name}'s Medications
          </Text>

          <Text>R: Refill, D: Change Dose, X: Cancel</Text>
          <Text>T: Taking, N: Not Taking, I: Taking incorrectly</Text>
        </View>

        <ScrollView contentContainerStyle={styles.tableContainer} horizontal>
          <MedicationTable style={styles.table}
            refill={this.refillMedication}
            change={this.changeMedication}
            discontinue={this.discontinueMedication}
            updates={this.state.updates}
            medicationCheckmarks={this.state.medicationCheckmarks}
            patientKey={this.props.currentPatientKey}
          />
        </ScrollView>

        <View style={styles.footerContainer}>
          <Button
            onPress={this.saveCheckmarks}
            style={styles.button}
            text='Save checkmarks'>
          </Button>

          <Button
            onPress={this.createNewMedication}
            style={styles.button}
            text='New Medication'>
          </Button>

          <Button
            onPress={this.completed}
            style={styles.button}
            text='Completed Prescribing'>
          </Button>

          <Button
            onPress={this.filled}
            style={styles.button}
            text='Filled'>
          </Button>
        </View>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
  },
  tableContainer: {
    flex: 0,
  },
  footerContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    margin: 4,
  },
  button: {
    width: 120,
    height: 60 
  }
});

// Redux
import { setLoading, setErrorMessage, setSuccessMessage, clearMessages, isUploading } from '../reduxActions/containerActions';
import { connect } from 'react-redux';

const mapStateToProps = state => ({
  loading: state.loading,
  currentPatientKey: state.currentPatientKey
});

const mapDispatchToProps = dispatch => ({
  setLoading: (val,showRetryButton) => dispatch(setLoading(val, showRetryButton)),
  setErrorMessage: val => dispatch(setErrorMessage(val)),
  setSuccessMessage: val => dispatch(setSuccessMessage(val)),
  clearMessages: () => dispatch(clearMessages()),
  isUploading: val => dispatch(isUploading(val))
});

export default connect(mapStateToProps, mapDispatchToProps)(MedicationScreen);
