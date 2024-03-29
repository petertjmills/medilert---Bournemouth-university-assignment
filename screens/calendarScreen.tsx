import * as React from 'react';
import { Text, View, StyleSheet, ScrollView, RefreshControl,Button } from 'react-native';

import CalendarStrip from 'react-native-calendar-strip';
import moment from 'moment';
import Moment from 'react-moment';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

import { Agenda } from '../components/TestComp';
import { MedicationList } from '../components/mymedicationscomp';
import { LogoTop } from '../components/LogoTop';

import { getColor, tw }  from '../constants/styling/tailwind'

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function TabOneScreen() {
  const [expoPushToken, setExpoPushToken] = React.useState('');
  const [notification, setNotification] = React.useState(false);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  React.useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  //currentDate
  const [date, setDate] = React.useState(moment());

  //refresh

  const wait = (timeout) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    wait(2000).then(() => setRefreshing(false));
    //getMedications()
    console.log(medications)
    console.log(medIds)
  };

  //medications update
  const [medications, setMedications] = React.useState({});
  const [medIds, setMedIds] = React.useState([]);
  const [update, setUpdate] = React.useState(true)

  React.useEffect(() => {
    const getValue = async () => {
      const ids = await SecureStore.getItemAsync('medications');
      if(ids){
        var idsDat = JSON.parse(ids)
        setMedIds(idsDat)
      }
    }
    getValue();

  }, [update]);

  React.useEffect(() => {
    const getValue = async () => {
      var meds = {}
      for (var i = medIds.length - 1; i >= 0; i--) {
        var id = medIds[i]
        const med = await SecureStore.getItemAsync(id)
        // @ts-ignore
        const medDat = JSON.parse(med)
        // @ts-ignore
        meds[id] = medDat
      }
      setMedications(meds)
    }
    getValue();

  }, [medIds]);
  // @ts-ignore
  const saveNewMedication = async (medication) => {
    var id = uuidv4()
    await SecureStore.setItemAsync(id, JSON.stringify(medication));
    await SecureStore.setItemAsync("medications", JSON.stringify([...medIds, id]));
    setUpdate(!update)
  }
  // @ts-ignore
  const deleteMedication = async (key) =>{
    await SecureStore.deleteItemAsync(key)
    var ids =[...medIds]
    var filteredIds = ids.filter(e => e !== key)
    await SecureStore.setItemAsync('medications', JSON.stringify(filteredIds))
    setUpdate(!update)
  }
  // @ts-ignore
  const getOneMed = async (key) => {
    const med = await SecureStore.getItemAsync(key)
    // @ts-ignore
    return JSON.parse(med)
  }
  // @ts-ignore
  const updateAmount = async (key, amount) => {
    var medication = await getOneMed(key)
    medication.amount = parseInt(medication.amount) + parseInt(amount)
    if(medication.amount < 0){
      medication.amount = 0
    }
    await SecureStore.setItemAsync(key, JSON.stringify(medication));
    setUpdate(!update)
  }

  return (
    <View style={tw('pt-10 bg-light h-full')}>
    <LogoTop />
    <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
    >
      <View style={styles.container}>
        <CalendarStrip
          scrollable
          style={{height:150, paddingTop: 20, paddingBottom: 10}}
          onDateSelected={date => setDate(date)}
          selectedDate={date}
          daySelectionAnimation={{type: 'border', duration: 200, borderWidth: 1, borderHighlightColor: 'black'}}
          calendarHeaderStyle={tw('subheading')}
        />

        <Agenda
          date={date}
          meds={medications}
          updateAmount={updateAmount}
          scheduleNotifcation={schedulePushNotification}
        ></Agenda>

        <MedicationList
          updateAmount={updateAmount}
          save={saveNewMedication}
          refresh={onRefresh}
          deleteItem={deleteMedication}
          meds={medications}>
         </MedicationList>
      </View>
      
     </ScrollView>
     </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

async function schedulePushNotification(trigger) {
  console.log(Date(trigger))
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Medication Reminder",
      body: 'Take your medication now!',
      data: { data: 'goes here' },
    },
    trigger: {seconds:2},
  });
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
