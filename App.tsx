import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

type ViewName = "people" | "missions" | "profile";
type LeaderboardMode = "friends" | "public";

type Mission = {
  id: number;
  title: string;
  place: string;
  detail: string;
  proof: string;
  difficulty: "Facile" | "Simple" | "Moyenne" | "Difficile" | "Speciale";
  aura: number;
  distance: string;
  duration: number;
  radius: number;
  latitude: number;
  longitude: number;
};

type SavedProgress = {
  aura: number;
  completed: number[];
  photoProofs: Record<number, string>;
};

const storageKey = "waya-mobile-progress-v1";

const ranks = [
  { name: "Inconnu", aura: 0 },
  { name: "Random", aura: 500 },
  { name: "Courageux", aura: 1000 },
  { name: "Vaillant", aura: 3000 },
  { name: "Phenomene", aura: 5000 },
  { name: "Monstre", aura: 7000 },
  { name: "Legende", aura: 15000 },
];

const missions: Mission[] = [
  {
    id: 1,
    title: "Tour du lac du Plessis",
    place: "Lac du Plessis",
    detail: "Rends-toi au lac, fais le tour complet, puis prends une photo du plan d'eau ou du chemin.",
    proof: "Photo du lac, du chemin ou du panneau autour du Plessis.",
    difficulty: "Speciale",
    aura: 500,
    distance: "2.1 km",
    duration: 35,
    radius: 100,
    latitude: 46.6798,
    longitude: 4.3568,
  },
  {
    id: 2,
    title: "Photo devant la mairie",
    place: "Hotel de Ville",
    detail: "Rejoins la mairie de Montceau-les-Mines et prends une photo de la facade ou du parvis.",
    proof: "Photo de la facade ou du parvis de l'Hotel de Ville.",
    difficulty: "Simple",
    aura: 150,
    distance: "0.8 km",
    duration: 15,
    radius: 70,
    latitude: 46.6743,
    longitude: 4.3633,
  },
  {
    id: 3,
    title: "Panneau rue Carnot",
    place: "Rue Carnot",
    detail: "Trouve le panneau de la rue Carnot et prends une photo ou l'on distingue bien le nom de la rue.",
    proof: "Photo lisible du panneau Rue Carnot.",
    difficulty: "Moyenne",
    aura: 200,
    distance: "1.0 km",
    duration: 18,
    radius: 60,
    latitude: 46.6752,
    longitude: 4.361,
  },
  {
    id: 4,
    title: "Check a la gare",
    place: "Gare de Montceau",
    detail: "Va jusqu'a la gare et prends une photo du panneau, de l'entree ou des quais visibles.",
    proof: "Photo du panneau, de l'entree ou des quais de la gare.",
    difficulty: "Difficile",
    aura: 350,
    distance: "1.8 km",
    duration: 28,
    radius: 80,
    latitude: 46.6716,
    longitude: 4.3669,
  },
  {
    id: 5,
    title: "Parc Maugrand",
    place: "Parc Maugrand",
    detail: "Rejoins une entree du parc Maugrand et prends une photo d'un chemin, d'un panneau ou d'un espace vert.",
    proof: "Photo d'une entree, d'un chemin ou d'un panneau du parc.",
    difficulty: "Facile",
    aura: 50,
    distance: "0.7 km",
    duration: 12,
    radius: 80,
    latitude: 46.6695,
    longitude: 4.3534,
  },
  {
    id: 6,
    title: "Passerelle du canal",
    place: "Canal du Centre",
    detail: "Rejoins la zone du canal et prends une photo d'une passerelle, d'une ecluse ou du bord de l'eau.",
    proof: "Photo d'une passerelle, d'une ecluse ou du bord du canal.",
    difficulty: "Moyenne",
    aura: 200,
    distance: "1.4 km",
    duration: 22,
    radius: 90,
    latitude: 46.6767,
    longitude: 4.3684,
  },
  {
    id: 7,
    title: "Facade de l'Embarcadere",
    place: "L'Embarcadere",
    detail: "Va devant l'Embarcadere et prends une photo de la facade ou du panneau du lieu.",
    proof: "Photo de la facade ou du panneau de l'Embarcadere.",
    difficulty: "Simple",
    aura: 150,
    distance: "0.9 km",
    duration: 16,
    radius: 70,
    latitude: 46.6759,
    longitude: 4.3649,
  },
  {
    id: 8,
    title: "Street check Saint-Louis",
    place: "Quartier Saint-Louis",
    detail: "Va dans le secteur Saint-Louis et prends une photo d'une rue, d'un panneau ou d'un repere du quartier.",
    proof: "Photo d'une rue, d'un panneau ou d'un repere Saint-Louis.",
    difficulty: "Difficile",
    aura: 350,
    distance: "1.9 km",
    duration: 30,
    radius: 100,
    latitude: 46.6824,
    longitude: 4.3671,
  },
];

const people = [
  { name: "@mcy.maya", rank: "Phenomene", aura: 5280 },
  { name: "@yanis713", rank: "Vaillant", aura: 3810 },
  { name: "@ness", rank: "Random", aura: 0, isUser: true },
  { name: "@lina.moves", rank: "Courageux", aura: 1260 },
  { name: "@plessis.run", rank: "Random", aura: 760 },
];

const publicPeople = [
  { name: "@montceau.ghost", rank: "Monstre", aura: 8120 },
  { name: "@canalrunner", rank: "Phenomene", aura: 5440 },
  { name: "@mcy.maya", rank: "Phenomene", aura: 5280 },
  { name: "@saintvallier7", rank: "Vaillant", aura: 3370 },
  { name: "@ness", rank: "Random", aura: 0, isUser: true },
];

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#ffd9ee" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#101214" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b4f7e5" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#bff5d3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffeaf5" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fff7fb" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6f6f76" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#ffc9e5" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#dfffee" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#69696d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
];

const initialRegion: Region = {
  latitude: 46.6743,
  longitude: 4.3633,
  latitudeDelta: 0.032,
  longitudeDelta: 0.032,
};

function getRank(aura: number) {
  const current = [...ranks].reverse().find((rank) => aura >= rank.aura) ?? ranks[0];
  const index = ranks.findIndex((rank) => rank.name === current.name);
  const next = ranks[index + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((aura - current.aura) / (next.aura - current.aura)) * 100))
    : 100;
  const needed = next ? next.aura - aura : 0;

  return { current, next, progress, needed };
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radius = 6371000;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function App() {
  const mapRef = useRef<MapView | null>(null);
  const [view, setView] = useState<ViewName>("missions");
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>("friends");
  const [aura, setAura] = useState(320);
  const [completed, setCompleted] = useState<number[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [missionStarted, setMissionStarted] = useState(false);
  const [photoProofs, setPhotoProofs] = useState<Record<number, string>>({});
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loaded, setLoaded] = useState(false);

  const rank = useMemo(() => getRank(aura), [aura]);
  const totalMinutes = completed.reduce((total, id) => {
    const mission = missions.find((item) => item.id === id);
    return total + (mission?.duration ?? 0);
  }, 0);
  const leaderboard = leaderboardMode === "friends" ? people : publicPeople;
  const userCoordinate = {
    latitude: userLocation?.latitude ?? initialRegion.latitude,
    longitude: userLocation?.longitude ?? initialRegion.longitude,
  };
  const nearbyMissions = useMemo(
    () =>
      missions
        .map((mission) => ({
          ...mission,
          liveDistance: distanceMeters(userCoordinate, mission),
        }))
        .sort((a, b) => a.liveDistance - b.liveDistance)
        .slice(0, 5),
    [userCoordinate.latitude, userCoordinate.longitude],
  );

  useEffect(() => {
    async function loadProgress() {
      try {
        const saved = await AsyncStorage.getItem(storageKey);

        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedProgress>;
          setAura(typeof parsed.aura === "number" ? parsed.aura : 320);
          setCompleted(Array.isArray(parsed.completed) ? parsed.completed : []);
          setPhotoProofs(parsed.photoProofs ?? {});
        }
      } finally {
        setLoaded(true);
      }
    }

    loadProgress();
    refreshLocation(false);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const progress: SavedProgress = { aura, completed, photoProofs };
    AsyncStorage.setItem(storageKey, JSON.stringify(progress));
  }, [aura, completed, loaded, photoProofs]);

  useEffect(() => {
    if (!userLocation || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.032,
        longitudeDelta: 0.032,
      },
      650,
    );
  }, [userLocation]);

  async function refreshLocation(showError = true) {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      if (showError) {
        Alert.alert("GPS refuse", "Active ta position pour valider les missions WAYA.");
      }
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setUserLocation(position.coords);
    return position.coords;
  }

  function openMission(mission: Mission) {
    if (completed.includes(mission.id)) {
      Alert.alert("Mission deja validee", "Trouve un nouveau move.");
      return;
    }

    setActiveMission(mission);
    setMissionStarted(false);
  }

  async function startMission() {
    setMissionStarted(true);
    await refreshLocation();
  }

  async function addPhotoProof() {
    if (!activeMission) {
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Camera refusee", "Autorise l'appareil photo pour ajouter une preuve.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoProofs((current) => ({
        ...current,
        [activeMission.id]: result.assets[0]?.uri ?? "preuve-photo",
      }));
    }
  }

  async function validateMission() {
    if (!activeMission) {
      return;
    }

    if (!photoProofs[activeMission.id]) {
      Alert.alert("Preuve manquante", "Ajoute une photo du lieu avant de valider.");
      return;
    }

    const location = await refreshLocation();

    if (!location) {
      return;
    }

    const distance = distanceMeters(location, activeMission);

    if (distance > activeMission.radius) {
      Alert.alert(
        "Encore trop loin",
        `Tu es a ${distance}m. Entre dans le rayon de ${activeMission.radius}m pour valider.`,
      );
      return;
    }

    const nextAura = aura + activeMission.aura;
    const nextRank = getRank(nextAura);

    setAura(nextAura);
    setCompleted((current) => [...current, activeMission.id]);
    setActiveMission(null);
    setMissionStarted(false);

    Alert.alert(
      "Mission validee",
      nextRank.current.name !== rank.current.name
        ? `Nouveau rang : ${nextRank.current.name}.`
        : `+${activeMission.aura} aura. Continue comme ca.`,
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {view === "missions" && <Header aura={aura} rank={rank} />}

        {view === "missions" && (
          <View style={styles.screen}>
            <View style={styles.mapShell}>
              <MapView
                customMapStyle={mapStyle}
                initialRegion={
                  userLocation
                    ? {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.032,
                        longitudeDelta: 0.032,
                      }
                    : initialRegion
                }
                loadingBackgroundColor="#ffffff"
                loadingEnabled
                loadingIndicatorColor="#ff4fa3"
                pitchEnabled
                ref={mapRef}
                rotateEnabled={false}
                showsUserLocation={false}
                style={styles.map}
              >
                <Marker coordinate={userCoordinate} onPress={() => setNearbyOpen(true)} tracksViewChanges={false}>
                  <UserMarker />
                </Marker>

                {missions.map((mission) => (
                  <Marker
                    coordinate={{ latitude: mission.latitude, longitude: mission.longitude }}
                    key={mission.id}
                    onPress={() => openMission(mission)}
                    tracksViewChanges={false}
                  >
                    <MissionMarker
                      done={completed.includes(mission.id)}
                      special={mission.difficulty === "Speciale"}
                    />
                  </Marker>
                ))}
              </MapView>
            </View>
          </View>
        )}

        {view === "people" && (
          <ScrollView contentContainerStyle={styles.scrollScreen}>
            <View style={styles.dailyCard}>
              <Text style={styles.dailyTitle}>
                Le scroll t'a assez garde en otage. Va prendre de l'aura. Montceau ne va pas se traverser toute seule.
              </Text>
            </View>

            <PeopleSwitch mode={leaderboardMode} setMode={setLeaderboardMode} />

            {leaderboard
              .map((person) => (person.isUser ? { ...person, aura, rank: rank.current.name } : person))
              .sort((a, b) => b.aura - a.aura)
              .map((person, index) => (
                <View style={[styles.personCard, person.isUser && styles.personCardActive]} key={person.name}>
                  <View style={styles.rankBubble}>
                    <Text style={styles.rankBubbleText}>{index + 1}</Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{person.name}</Text>
                    <Text style={styles.personRank}>{person.rank}</Text>
                  </View>
                  <Text style={styles.personAura}>{person.aura}</Text>
                </View>
              ))}
          </ScrollView>
        )}

        {view === "profile" && (
          <ScrollView contentContainerStyle={styles.scrollScreen}>
            <View style={styles.profileHero}>
              <View style={styles.profileHeroTop}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>N</Text>
                </View>
                <View style={styles.profileIdentity}>
                  <Text style={styles.profileHandle}>@ness</Text>
                  <Text style={styles.profileRank}>{rank.current.name}</Text>
                </View>
              </View>

              <View style={styles.profileRankPanel}>
                <View style={styles.profileRankPanelTop}>
                  <Text style={styles.profileRankPanelLabel}>Prochain rang</Text>
                  <Text style={styles.profileRankPanelNext}>{rank.next?.name ?? "Max"}</Text>
                </View>
                <View style={styles.profileHeroTrack}>
                  <View style={[styles.profileHeroFill, { width: `${rank.progress}%` }]} />
                </View>
                <Text style={styles.profileRankMissing}>
                  {rank.next ? `${rank.needed} aura manquante` : "Rang maximum atteint"}
                </Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              <ProfileStat label="Compte cree" value="27 aout" />
              <ProfileStat label="Temps total" value={`${totalMinutes || 12} min`} />
              <ProfileStat label="Missions" value={completed.length.toString()} />
              <ProfileStat label="Km parcourus" value={(completed.length * 1.1 + 2.4).toFixed(1)} />
            </View>

            <View style={styles.playerCard}>
              <Text style={styles.playerTitle}>Profil joueur</Text>
              {[
                ["Regularite", 46, "#17e689"],
                ["Courage", 64, "#ff4fa3"],
                ["Exploration", 58, "#17e689"],
                ["Discipline", 40, "#17e689"],
                ["Sociabilite", 52, "#ff4fa3"],
              ].map(([label, value, color]) => (
                <View style={styles.qualityRow} key={String(label)}>
                  <Text style={styles.qualityLabel}>{label}</Text>
                  <View style={styles.qualityTrack}>
                    <View
                      style={[
                        styles.qualityFill,
                        { backgroundColor: String(color), width: `${Number(value)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.nav}>
          <Tab active={view === "people"} label="Personnes" onPress={() => setView("people")} />
          <Tab active={view === "missions"} label="Missions" onPress={() => setView("missions")} />
          <Tab active={view === "profile"} label="Profil" onPress={() => setView("profile")} />
        </View>
      </View>

      <MissionModal
        addPhotoProof={addPhotoProof}
        close={() => setActiveMission(null)}
        completed={activeMission ? completed.includes(activeMission.id) : false}
        mission={activeMission}
        missionStarted={missionStarted}
        photoReady={activeMission ? Boolean(photoProofs[activeMission.id]) : false}
        startMission={startMission}
        validateMission={validateMission}
      />

      <NearbyMissionsModal
        close={() => setNearbyOpen(false)}
        missions={nearbyMissions}
        open={nearbyOpen}
        openMission={(mission) => {
          setNearbyOpen(false);
          openMission(mission);
        }}
      />
    </SafeAreaView>
  );
}

function Header({
  aura,
  rank,
}: {
  aura: number;
  rank: ReturnType<typeof getRank>;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>
          <View>
            <Text style={styles.name}>Ness</Text>
            <Text style={styles.handle}>@ness</Text>
          </View>
        </View>
        <Text style={styles.logo}>WAYA</Text>
      </View>
      <View style={styles.progressCard}>
        <View>
          <Text style={styles.progressLabel}>Rang</Text>
          <Text style={styles.currentRank}>{rank.current.name}</Text>
        </View>
        <View style={styles.progressMiddle}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${rank.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {rank.next ? `${rank.needed} aura avant ${rank.next.name}` : "Rang max"}
          </Text>
        </View>
        <View>
          <Text style={styles.progressLabel}>Aura</Text>
          <Text style={styles.aura}>{aura}</Text>
        </View>
      </View>
    </View>
  );
}

function NearbyMissionsModal({
  close,
  missions,
  open,
  openMission,
}: {
  close: () => void;
  missions: (Mission & { liveDistance: number })[];
  open: boolean;
  openMission: (mission: Mission) => void;
}) {
  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={open}>
      <Pressable onPress={close} style={styles.nearbyBackdrop}>
        <Pressable style={styles.nearbyCard}>
          <View style={styles.nearbyHeader}>
            <Text style={styles.nearbyEyebrow}>Autour de toi</Text>
            <Text style={styles.nearbyCount}>{missions.length}</Text>
          </View>
          <Text style={styles.nearbyTitle}>Missions proches</Text>

          {missions.map((mission) => (
            <Pressable
              key={mission.id}
              onPress={() => openMission(mission)}
              style={({ pressed }) => [styles.nearbyMission, pressed && styles.pressed]}
            >
              <View style={styles.nearbyMissionText}>
                <Text style={styles.nearbyMissionTitle}>{mission.title}</Text>
                <Text style={styles.nearbyMissionPlace}>
                  {mission.place} · {mission.liveDistance < 1000
                    ? `${mission.liveDistance}m`
                    : `${(mission.liveDistance / 1000).toFixed(1)}km`}
                </Text>
              </View>
              <Text style={styles.nearbyAura}>+{mission.aura}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MissionModal({
  addPhotoProof,
  close,
  mission,
  missionStarted,
  photoReady,
  startMission,
  validateMission,
}: {
  addPhotoProof: () => void;
  close: () => void;
  completed: boolean;
  mission: Mission | null;
  missionStarted: boolean;
  photoReady: boolean;
  startMission: () => void;
  validateMission: () => void;
}) {
  if (!mission) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Pressable onPress={close} style={styles.modalHandle} />
          <Text style={styles.modalEyebrow}>{missionStarted ? "Mission active" : "Detail mission"}</Text>
          <Text style={styles.modalTitle}>{mission.title}</Text>
          <Text style={styles.modalPlace}>{mission.place}</Text>
          <Text style={styles.modalDetail}>{mission.detail}</Text>

          <View style={styles.modalStats}>
            <SmallStat label="Aura" value={`+${mission.aura}`} />
            <SmallStat label="Niveau" value={mission.difficulty} />
            <SmallStat label="Rayon" value={`${mission.radius}m`} />
          </View>

          {missionStarted && (
            <Pressable onPress={addPhotoProof} style={styles.photoButton}>
              <Text style={styles.photoTitle}>{photoReady ? "Preuve photo ajoutee" : "Ajouter une preuve photo"}</Text>
              <Text style={styles.photoText}>{photoReady ? "La preuve est prete." : mission.proof}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={missionStarted ? validateMission : startMission}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>
              {missionStarted ? "Valider la mission" : "Demarrer la mission"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatLabel}>{label}</Text>
      <Text style={styles.smallStatValue}>{value}</Text>
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatLabel}>{label}</Text>
      <Text style={styles.profileStatValue}>{value}</Text>
    </View>
  );
}

function MissionMarker({ done, special }: { done: boolean; special: boolean }) {
  return (
    <View style={[styles.markerHalo, special && styles.markerHaloSpecial]}>
      <View style={[styles.marker, done && styles.markerDone]}>
        <View style={styles.walkerHead} />
        <View style={styles.walkerBody} />
        <View style={styles.walkerArm} />
        <View style={styles.walkerLegLeft} />
        <View style={styles.walkerLegRight} />
      </View>
    </View>
  );
}

function UserMarker() {
  return (
    <View style={styles.userMarkerWrap}>
      <View style={styles.userMarkerPulse} />
      <View style={styles.userMarker}>
        <Text style={styles.userMarkerText}>Toi</Text>
      </View>
    </View>
  );
}

function PeopleSwitch({
  mode,
  setMode,
}: {
  mode: LeaderboardMode;
  setMode: (mode: LeaderboardMode) => void;
}) {
  return (
    <View style={styles.peopleSwitch}>
      <Pressable
        onPress={() => setMode("friends")}
        style={[styles.peopleSwitchTab, mode === "friends" && styles.peopleSwitchTabActive]}
      >
        <Text style={[styles.peopleSwitchText, mode === "friends" && styles.peopleSwitchTextActive]}>Amis</Text>
      </Pressable>
      <Pressable
        onPress={() => setMode("public")}
        style={[styles.peopleSwitchTab, mode === "public" && styles.peopleSwitchTabActive]}
      >
        <Text style={[styles.peopleSwitchText, mode === "public" && styles.peopleSwitchTextActive]}>Publics</Text>
      </Pressable>
    </View>
  );
}

function Tab({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: "#fbfcfc",
    flex: 1,
  },
  aura: {
    color: "#11b96f",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#101214",
    borderRadius: 24,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  currentRank: {
    color: "#101214",
    fontSize: 20,
    fontWeight: "900",
  },
  dailyCard: {
    backgroundColor: "#ff4fa3",
    borderRadius: 24,
    marginBottom: 2,
    padding: 16,
  },
  dailyText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  dailyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  handle: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  header: {
    backgroundColor: "#fbfcfc",
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    zIndex: 1,
  },
  logo: {
    color: "#ff4fa3",
    fontSize: 28,
    fontStyle: "italic",
    fontWeight: "800",
    left: 0,
    letterSpacing: 0.2,
    position: "absolute",
    right: 0,
    textAlign: "center",
  },
  map: {
    flex: 1,
  },
  mapShell: {
    borderColor: "#ffffff",
    borderRadius: 34,
    borderWidth: 6,
    flex: 1,
    marginBottom: 92,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  marker: {
    alignItems: "center",
    backgroundColor: "#ff4fa3",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    shadowColor: "#ff4fa3",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    width: 36,
  },
  markerDone: {
    backgroundColor: "#17e689",
  },
  markerHalo: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    width: 44,
  },
  markerHaloSpecial: {
    backgroundColor: "rgba(255,79,163,0.18)",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.25)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 20,
    paddingBottom: 34,
  },
  modalDetail: {
    color: "rgba(0,0,0,0.58)",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 12,
  },
  modalEyebrow: {
    color: "#17e689",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
    borderRadius: 20,
    height: 5,
    marginBottom: 18,
    width: 52,
  },
  modalPlace: {
    color: "#ff4fa3",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginTop: 6,
    textTransform: "uppercase",
  },
  modalStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  modalTitle: {
    color: "#101214",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
  },
  name: {
    color: "#101214",
    fontSize: 14,
    fontWeight: "900",
  },
  nearbyAura: {
    color: "#11b96f",
    fontSize: 17,
    fontWeight: "900",
  },
  nearbyBackdrop: {
    backgroundColor: "rgba(0,0,0,0.18)",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  nearbyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  nearbyCount: {
    backgroundColor: "#eafff5",
    borderRadius: 999,
    color: "#11b96f",
    fontSize: 15,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  nearbyEyebrow: {
    color: "#ff4fa3",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  nearbyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nearbyMission: {
    alignItems: "center",
    backgroundColor: "#fbfcfc",
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 10,
    padding: 13,
  },
  nearbyMissionPlace: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  nearbyMissionText: {
    flex: 1,
  },
  nearbyMissionTitle: {
    color: "#101214",
    fontSize: 15,
    fontWeight: "900",
  },
  nearbyTitle: {
    color: "#101214",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 6,
    marginTop: 6,
  },
  nav: {
    backgroundColor: "#ffffff",
    borderRadius: 34,
    bottom: 20,
    elevation: 8,
    flexDirection: "row",
    gap: 4,
    left: 18,
    padding: 8,
    position: "absolute",
    right: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  personAura: {
    color: "#11b96f",
    fontSize: 18,
    fontWeight: "900",
  },
  personCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 14,
  },
  personCardActive: {
    backgroundColor: "#eafff5",
    borderColor: "#17e689",
  },
  personInfo: {
    flex: 1,
    marginLeft: 12,
  },
  personName: {
    color: "#101214",
    fontSize: 18,
    fontWeight: "900",
  },
  personRank: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 13,
    fontWeight: "800",
  },
  peopleSwitch: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
    padding: 5,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  peopleSwitchTab: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  peopleSwitchTabActive: {
    backgroundColor: "#101214",
  },
  peopleSwitchText: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 13,
    fontWeight: "900",
  },
  peopleSwitchTextActive: {
    color: "#ffffff",
  },
  photoButton: {
    backgroundColor: "#fff2f8",
    borderColor: "rgba(255,79,163,0.35)",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  photoText: {
    color: "rgba(0,0,0,0.5)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  photoTitle: {
    color: "#101214",
    fontSize: 15,
    fontWeight: "900",
  },
  playerCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
  },
  playerTitle: {
    color: "#101214",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 18,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#ff4fa3",
    borderRadius: 22,
    marginTop: 18,
    padding: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  profileAvatarText: {
    color: "#101214",
    fontSize: 34,
    fontWeight: "900",
  },
  profileHandle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "800",
  },
  profileHero: {
    backgroundColor: "#101214",
    borderRadius: 32,
    gap: 22,
    padding: 20,
  },
  profileHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  profileIdentity: {
    flex: 1,
  },
  profileRankPanel: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 26,
    padding: 16,
  },
  profileRankPanelTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  profileRankPanelLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 15,
    fontWeight: "900",
  },
  profileRankPanelNext: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  profileHeroTrack: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  profileHeroFill: {
    backgroundColor: "#ff4fa3",
    borderRadius: 999,
    height: "100%",
  },
  profileRankMissing: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
  },
  profileRank: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
  },
  profileStat: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0,0,0,0.06)",
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 110,
    padding: 16,
    width: "48%",
  },
  profileStatLabel: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 14,
    fontWeight: "900",
  },
  profileStatValue: {
    color: "#101214",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 16,
  },
  progressCard: {
    alignItems: "center",
    backgroundColor: "#fbfcfc",
    borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 12,
  },
  progressFill: {
    backgroundColor: "#ff4fa3",
    borderRadius: 999,
    height: "100%",
  },
  progressLabel: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 11,
    fontWeight: "800",
  },
  progressMiddle: {
    flex: 1,
  },
  progressText: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },
  progressTrack: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  qualityFill: {
    borderRadius: 999,
    height: "100%",
  },
  qualityLabel: {
    color: "#101214",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 7,
  },
  qualityRow: {
    marginBottom: 15,
  },
  qualityTrack: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  rankBubble: {
    alignItems: "center",
    backgroundColor: "#101214",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  rankBubbleText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  safe: {
    backgroundColor: "#f3f6f4",
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingTop: 10,
  },
  scrollScreen: {
    backgroundColor: "#f7f8f7",
    gap: 14,
    padding: 18,
    paddingBottom: 118,
  },
  smallStat: {
    backgroundColor: "#f4fff9",
    borderRadius: 18,
    flex: 1,
    padding: 10,
  },
  smallStatLabel: {
    color: "rgba(0,0,0,0.45)",
    fontSize: 11,
    fontWeight: "800",
  },
  smallStatValue: {
    color: "#101214",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 5,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  userMarker: {
    alignItems: "center",
    backgroundColor: "#101214",
    borderColor: "#ff4fa3",
    borderRadius: 999,
    borderWidth: 3,
    minWidth: 54,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#ff4fa3",
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  userMarkerPulse: {
    backgroundColor: "rgba(255,79,163,0.2)",
    borderRadius: 999,
    height: 72,
    position: "absolute",
    width: 72,
  },
  userMarkerText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  userMarkerWrap: {
    alignItems: "center",
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  tab: {
    alignItems: "center",
    borderRadius: 26,
    flex: 1,
    paddingVertical: 16,
  },
  tabActive: {
    backgroundColor: "#101214",
  },
  tabText: {
    color: "rgba(0,0,0,0.42)",
    fontSize: 15,
    fontWeight: "900",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    position: "relative",
  },
  walkerArm: {
    backgroundColor: "#ffffff",
    borderRadius: 5,
    height: 4,
    left: 11,
    position: "absolute",
    top: 17,
    transform: [{ rotate: "-28deg" }],
    width: 16,
  },
  walkerBody: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    height: 13,
    position: "absolute",
    top: 12,
    transform: [{ rotate: "12deg" }],
    width: 5,
  },
  walkerHead: {
    backgroundColor: "#ffffff",
    borderRadius: 5,
    height: 8,
    position: "absolute",
    top: 7,
    width: 8,
  },
  walkerLegLeft: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    height: 5,
    left: 11,
    position: "absolute",
    top: 25,
    transform: [{ rotate: "-28deg" }],
    width: 13,
  },
  walkerLegRight: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    height: 5,
    position: "absolute",
    right: 10,
    top: 25,
    transform: [{ rotate: "34deg" }],
    width: 13,
  },
});
