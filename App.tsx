import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ViewName = "home" | "circle" | "you";
type Visibility = "private" | "circle" | "local";
type MediaKind = "photo" | "video";

type Trace = {
  id: string;
  author: string;
  handle: string;
  text: string;
  createdAt: string;
  visibility: Visibility;
  mood?: string;
  place?: string;
  mediaKind?: MediaKind;
  mediaUri?: string;
  isMine?: boolean;
  replies: number;
};

type SavedState = {
  traces: Trace[];
  viewedMedia: string[];
  lastActiveAt: string;
};

const storageKey = "waya-social-journal-v2";
const ink = "#08090A";
const paper = "#FFFFFF";
const canvas = "#F7F7F5";
const smoke = "#EFEEEA";
const line = "#E1DFDA";
const deepLine = "#141414";
const muted = "#7D7972";
const faint = "#F3F2EF";

const starterTraces: Trace[] = [
  {
    id: "seed-1",
    author: "As",
    handle: "@as",
    text: "Journee bizarre, j'sais meme pas s'il fait chaud ou froid...",
    createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    visibility: "circle",
    mood: "flou",
    place: "Montceau",
    mediaKind: "photo",
    replies: 3,
  },
  {
    id: "seed-2",
    author: "Nolan",
    handle: "@nolan",
    text: "Ca craint, mais au moins c'est note quelque part.",
    createdAt: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
    visibility: "circle",
    mood: "fatigue",
    replies: 1,
  },
  {
    id: "seed-3",
    author: "Zer",
    handle: "@zer",
    text: "Boulot de merde. J'avais juste besoin de poser la phrase.",
    createdAt: new Date(Date.now() - 1000 * 60 * 93).toISOString(),
    visibility: "local",
    place: "Le Creusot",
    replies: 0,
  },
  {
    id: "seed-4",
    author: "Maya",
    handle: "@maya",
    text: "Petit moment calme, ca faisait longtemps.",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    visibility: "circle",
    mood: "pose",
    mediaKind: "video",
    replies: 6,
  },
];

const friends = ["As", "Nolan", "Zer", "Maya", "Yanis", "Lina"];
const mapDots = [
  { left: 58, top: 52 },
  { left: 214, top: 34 },
  { left: 152, top: 92 },
  { left: 252, top: 116 },
  { left: 94, top: 124 },
];

function formatTraceTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  return `${Math.floor(hours / 24)} j`;
}

function visibilityLabel(visibility: Visibility) {
  if (visibility === "private") {
    return "Prive";
  }

  if (visibility === "local") {
    return "Public";
  }

  return "Entourage";
}

function computePresence(traces: Trace[], lastActiveAt: string) {
  const mine = traces.filter((trace) => trace.isMine);
  const daysInactive = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86400000);

  return Math.max(8, Math.min(100, 42 + mine.length * 8 - daysInactive * 5));
}

export default function App() {
  const [view, setView] = useState<ViewName>("home");
  const [traces, setTraces] = useState<Trace[]>(starterTraces);
  const [viewedMedia, setViewedMedia] = useState<string[]>([]);
  const [lastActiveAt, setLastActiveAt] = useState(new Date().toISOString());
  const [composerOpen, setComposerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const presence = useMemo(() => computePresence(traces, lastActiveAt), [lastActiveAt, traces]);
  const sortedTraces = useMemo(
    () => [...traces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [traces],
  );
  const myTraces = useMemo(() => sortedTraces.filter((trace) => trace.isMine), [sortedTraces]);

  useEffect(() => {
    async function loadState() {
      try {
        const saved = await AsyncStorage.getItem(storageKey);

        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedState>;
          setTraces(Array.isArray(parsed.traces) && parsed.traces.length ? parsed.traces : starterTraces);
          setViewedMedia(Array.isArray(parsed.viewedMedia) ? parsed.viewedMedia : []);
          setLastActiveAt(typeof parsed.lastActiveAt === "string" ? parsed.lastActiveAt : new Date().toISOString());
        }
      } finally {
        setLoaded(true);
      }
    }

    loadState();
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const state: SavedState = { traces, viewedMedia, lastActiveAt };
    AsyncStorage.setItem(storageKey, JSON.stringify(state));
  }, [lastActiveAt, loaded, traces, viewedMedia]);

  function addTrace(trace: Omit<Trace, "id" | "createdAt" | "author" | "handle" | "isMine" | "replies">) {
    const nextTrace: Trace = {
      ...trace,
      id: `trace-${Date.now()}`,
      author: "Ness",
      handle: "@ness",
      createdAt: new Date().toISOString(),
      isMine: true,
      replies: 0,
    };

    setTraces((current) => [nextTrace, ...current]);
    setLastActiveAt(new Date().toISOString());
    setComposerOpen(false);
  }

  function answerTrace(trace: Trace) {
    setLastActiveAt(new Date().toISOString());
    setTraces((current) =>
      current.map((item) => (item.id === trace.id ? { ...item, replies: item.replies + 1 } : item)),
    );
    Alert.alert("Reponse envoyee", `Tu viens de repondre a ${trace.author}.`);
  }

  function openMedia(trace: Trace) {
    if (!trace.mediaKind) {
      return;
    }

    if (viewedMedia.includes(trace.id) && !trace.isMine) {
      Alert.alert("Deja vu", "Ce moment ne pouvait etre ouvert qu'une seule fois.");
      return;
    }

    setViewedMedia((current) => (current.includes(trace.id) ? current : [...current, trace.id]));
    Alert.alert(
      trace.mediaKind === "video" ? "Video ouverte" : "Photo ouverte",
      trace.mediaUri
        ? "Le media est attache a cette trace. L'ouverture plein ecran arrive ensuite."
        : "Media fictif pour montrer le comportement visuel.",
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {view === "home" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <ScreenTitle label="Accueil" title="Dernieres traces" />
            <View style={styles.traceList}>
              {sortedTraces.map((trace) => (
                <TraceCard
                  key={trace.id}
                  onAnswer={() => answerTrace(trace)}
                  onOpenMedia={() => openMedia(trace)}
                  trace={trace}
                  viewed={viewedMedia.includes(trace.id)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        {view === "circle" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <ScreenTitle label="Entourage" title="Les gens qui comptent" />
            <View style={styles.peopleGrid}>
              {friends.map((name, index) => (
                <View key={name} style={styles.friendCard}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendInitial}>{name[0]}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{name}</Text>
                    <Text style={styles.friendMeta}>
                      {index % 2 === 0 ? "A laisse une trace aujourd'hui" : "Silencieux depuis hier"}
                    </Text>
                  </View>
                  <View style={styles.friendSignal} />
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {view === "you" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <ScreenTitle label="Toi" title="Carnet personnel" />
            <View style={styles.youHero}>
              <View style={styles.youIdentity}>
                <View style={styles.youAvatar}>
                  <Text style={styles.youAvatarText}>N</Text>
                </View>
                <View>
                  <Text style={styles.youName}>Ness</Text>
                  <Text style={styles.youMeta}>journal de bord</Text>
                </View>
              </View>
              <View style={styles.presenceTrack}>
                <View style={[styles.presenceFill, { width: `${presence}%` }]} />
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Traces" value={String(myTraces.length)} />
              <StatCard label="Pas" value={(4200 + myTraces.length * 380).toLocaleString("fr-FR")} />
              <StatCard label="Lieux" value={String(new Set(myTraces.map((trace) => trace.place).filter(Boolean)).size)} />
              <StatCard label="Jours" value={String(Math.max(1, Math.ceil(myTraces.length / 2)))} />
            </View>

            <MemoryMap traces={myTraces} />

            <View style={styles.personalBlock}>
              <Text style={styles.blockTitle}>Tes dernieres traces</Text>
              {myTraces.length ? (
                <View style={styles.traceList}>
                  {myTraces.slice(0, 3).map((trace) => (
                    <TraceCard
                      compact
                      key={trace.id}
                      onAnswer={() => answerTrace(trace)}
                      onOpenMedia={() => openMedia(trace)}
                      trace={trace}
                      viewed={viewedMedia.includes(trace.id)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Encore rien ici</Text>
                  <Text style={styles.emptyText}>Ta premiere trace viendra remplir ton carnet personnel.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        <Pressable
          onPress={() => setComposerOpen(true)}
          style={({ pressed }) => [styles.composeButton, pressed && styles.pressed]}
        >
          <Text style={styles.composePlus}>+</Text>
          <Text style={styles.composeText}>Trace</Text>
        </Pressable>

        <View style={styles.nav}>
          <Tab active={view === "circle"} label="Entourage" onPress={() => setView("circle")} />
          <Tab active={view === "home"} label="Accueil" onPress={() => setView("home")} />
          <Tab active={view === "you"} label="Toi" onPress={() => setView("you")} />
        </View>
      </View>

      <TraceComposer close={() => setComposerOpen(false)} onCreate={addTrace} visible={composerOpen} />
    </SafeAreaView>
  );
}

function ScreenTitle({ label, title }: { label: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MemoryMap({ traces }: { traces: Trace[] }) {
  const visibleDots = traces.length ? traces.slice(0, 5) : [{ id: "empty" }];

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapHeader}>
        <Text style={styles.blockTitle}>Carte des traces</Text>
        <Text style={styles.mapCount}>{traces.filter((trace) => trace.place).length}</Text>
      </View>
      <View style={styles.miniMap}>
        <View style={[styles.mapRoad, styles.mapRoadOne]} />
        <View style={[styles.mapRoad, styles.mapRoadTwo]} />
        <View style={[styles.mapRoad, styles.mapRoadThree]} />
        {visibleDots.map((trace, index) => (
          <View
            key={trace.id}
            style={[styles.mapDot, mapDots[index], traces.length === 0 && styles.mapDotMuted]}
          />
        ))}
      </View>
    </View>
  );
}

function TraceCard({
  compact,
  onAnswer,
  onOpenMedia,
  trace,
  viewed,
}: {
  compact?: boolean;
  onAnswer: () => void;
  onOpenMedia: () => void;
  trace: Trace;
  viewed: boolean;
}) {
  const hasMedia = Boolean(trace.mediaKind);

  return (
    <View
      style={[
        styles.traceCard,
        hasMedia && styles.traceCardMedia,
        hasMedia && viewed && styles.traceCardViewed,
        compact && styles.traceCardCompact,
      ]}
    >
      <View style={styles.innerStroke} />
      <View style={styles.traceTop}>
        <View style={styles.traceAuthorWrap}>
          <View style={[styles.traceAvatar, hasMedia && styles.traceAvatarMedia]}>
            <Text style={styles.traceAvatarText}>{trace.author[0]}</Text>
          </View>
          <View>
            <Text style={styles.traceAuthor}>{trace.author}</Text>
            <Text style={styles.traceMeta}>
              {formatTraceTime(trace.createdAt)} · {visibilityLabel(trace.visibility)}
            </Text>
          </View>
        </View>
        {hasMedia && (
          <Pressable onPress={onOpenMedia} style={[styles.mediaBadge, viewed && styles.mediaBadgeViewed]}>
            <Text style={[styles.mediaBadgeText, viewed && styles.mediaBadgeTextViewed]}>
              {trace.mediaKind === "video" ? "Video" : "Photo"}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.traceText}>{trace.text}</Text>

      {trace.mediaUri && trace.mediaKind === "photo" && trace.isMine && (
        <Image source={{ uri: trace.mediaUri }} style={styles.traceImage} />
      )}

      <View style={styles.traceFooter}>
        <Text style={styles.traceContext}>
          {[trace.mood, trace.place].filter(Boolean).join(" · ") || "trace simple"}
        </Text>
        {!trace.isMine && (
          <Pressable onPress={onAnswer} style={styles.replyButton}>
            <Text style={styles.replyText}>{trace.replies ? `${trace.replies} reponses` : "Repondre"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function TraceComposer({
  close,
  onCreate,
  visible,
}: {
  close: () => void;
  onCreate: (trace: Omit<Trace, "id" | "createdAt" | "author" | "handle" | "isMine" | "replies">) => void;
  visible: boolean;
}) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("circle");
  const [mediaKind, setMediaKind] = useState<MediaKind | undefined>();
  const [mediaUri, setMediaUri] = useState<string | undefined>();
  const [mood, setMood] = useState("");
  const [place, setPlace] = useState("");

  function reset() {
    setText("");
    setVisibility("circle");
    setMediaKind(undefined);
    setMediaUri(undefined);
    setMood("");
    setPlace("");
  }

  async function addMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Acces refuse", "Autorise les photos pour attacher un media a ta trace.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.75,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMediaUri(asset?.uri);
      setMediaKind(asset?.type === "video" ? "video" : "photo");
    }
  }

  function submit() {
    const cleanText = text.trim();

    if (!cleanText && !mediaUri) {
      Alert.alert("Trace vide", "Pose une phrase ou ajoute un media avant de deposer ta trace.");
      return;
    }

    onCreate({
      text: cleanText || "Un moment depose sans phrase.",
      visibility,
      mood: mood.trim() || undefined,
      place: place.trim() || undefined,
      mediaKind,
      mediaUri,
    });
    reset();
  }

  function closeAndReset() {
    reset();
    close();
  }

  return (
    <Modal animationType="fade" onRequestClose={closeAndReset} transparent visible={visible}>
      <View style={styles.composerBackdrop}>
        <View style={styles.composerCard}>
          <View style={styles.composerTop}>
            <View>
              <Text style={styles.composerLabel}>Laisser une trace</Text>
              <Text style={styles.composerTitle}>Qu'est-ce que tu gardes d'aujourd'hui ?</Text>
            </View>
            <Pressable onPress={closeAndReset} style={styles.closeButton}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <TextInput
            multiline
            onChangeText={setText}
            placeholder="Pose une phrase, meme courte..."
            placeholderTextColor="#A4A09A"
            style={styles.input}
            value={text}
          />

          <View style={styles.inlineInputs}>
            <TextInput
              onChangeText={setMood}
              placeholder="humeur"
              placeholderTextColor="#A4A09A"
              style={styles.miniInput}
              value={mood}
            />
            <TextInput
              onChangeText={setPlace}
              placeholder="lieu approx."
              placeholderTextColor="#A4A09A"
              style={styles.miniInput}
              value={place}
            />
          </View>

          <View style={styles.visibilityRow}>
            <VisibilityPill active={visibility === "private"} label="Prive" onPress={() => setVisibility("private")} />
            <VisibilityPill active={visibility === "circle"} label="Entourage" onPress={() => setVisibility("circle")} />
            <VisibilityPill active={visibility === "local"} label="Public" onPress={() => setVisibility("local")} />
          </View>

          <Pressable onPress={addMedia} style={[styles.mediaPicker, mediaKind && styles.mediaPickerActive]}>
            <Text style={styles.mediaPickerTitle}>{mediaKind ? `${mediaKind} attachee` : "Ajouter photo/video"}</Text>
            <Text style={styles.mediaPickerText}>Visible une seule fois par les autres.</Text>
          </Pressable>

          <Pressable onPress={submit} style={({ pressed }) => [styles.depositButton, pressed && styles.pressed]}>
            <Text style={styles.depositText}>Deposer la trace</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function VisibilityPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.visibilityPill, active && styles.visibilityPillActive]}>
      <Text style={[styles.visibilityText, active && styles.visibilityTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: canvas,
    flex: 1,
  },
  blockTitle: {
    color: ink,
    fontSize: 17,
    fontWeight: "900",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: faint,
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeText: {
    color: ink,
    fontSize: 20,
    fontWeight: "900",
  },
  composeButton: {
    alignItems: "center",
    backgroundColor: ink,
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 28,
    borderWidth: 4,
    bottom: 86,
    elevation: 10,
    height: 72,
    justifyContent: "center",
    left: "50%",
    marginLeft: -36,
    position: "absolute",
    shadowColor: ink,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    width: 72,
  },
  composePlus: {
    color: paper,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 30,
  },
  composeText: {
    color: paper,
    fontSize: 11,
    fontWeight: "900",
    marginTop: -2,
  },
  composerBackdrop: {
    backgroundColor: "rgba(8,9,10,0.26)",
    flex: 1,
    justifyContent: "flex-end",
  },
  composerCard: {
    backgroundColor: paper,
    borderColor: "rgba(255,255,255,0.8)",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 34,
  },
  composerLabel: {
    color: muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  composerTitle: {
    color: ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: 8,
    maxWidth: 270,
  },
  composerTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  depositButton: {
    alignItems: "center",
    backgroundColor: ink,
    borderRadius: 24,
    marginTop: 16,
    paddingVertical: 17,
  },
  depositText: {
    color: paper,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    color: muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 6,
  },
  emptyTitle: {
    color: ink,
    fontSize: 18,
    fontWeight: "900",
  },
  friendAvatar: {
    alignItems: "center",
    backgroundColor: ink,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  friendCard: {
    alignItems: "center",
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    shadowColor: ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
  },
  friendInfo: {
    flex: 1,
  },
  friendInitial: {
    color: paper,
    fontSize: 16,
    fontWeight: "900",
  },
  friendMeta: {
    color: muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  friendName: {
    color: ink,
    fontSize: 18,
    fontWeight: "900",
  },
  friendSignal: {
    backgroundColor: smoke,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  inlineInputs: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  innerStroke: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    height: 1,
    left: 18,
    position: "absolute",
    right: 18,
    top: 9,
  },
  input: {
    backgroundColor: "#FBFBFA",
    borderColor: line,
    borderRadius: 24,
    borderWidth: 1,
    color: ink,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: 18,
    minHeight: 136,
    padding: 18,
    textAlignVertical: "top",
  },
  mapCard: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 30,
    borderWidth: 1,
    padding: 16,
    shadowColor: ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 22,
  },
  mapCount: {
    color: muted,
    fontSize: 14,
    fontWeight: "900",
  },
  mapDot: {
    backgroundColor: ink,
    borderColor: paper,
    borderRadius: 999,
    borderWidth: 4,
    height: 22,
    position: "absolute",
    shadowColor: ink,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    width: 22,
  },
  mapDotMuted: {
    backgroundColor: "#C7C4BE",
  },
  mapHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mapRoad: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "#DDDAD3",
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    position: "absolute",
    width: 210,
  },
  mapRoadOne: {
    left: -18,
    top: 48,
    transform: [{ rotate: "-19deg" }],
  },
  mapRoadThree: {
    left: 82,
    top: 118,
    transform: [{ rotate: "-32deg" }],
  },
  mapRoadTwo: {
    right: -30,
    top: 84,
    transform: [{ rotate: "31deg" }],
  },
  mediaBadge: {
    backgroundColor: ink,
    borderColor: deepLine,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mediaBadgeText: {
    color: paper,
    fontSize: 11,
    fontWeight: "900",
  },
  mediaBadgeTextViewed: {
    color: muted,
  },
  mediaBadgeViewed: {
    backgroundColor: faint,
    borderColor: line,
  },
  mediaPicker: {
    backgroundColor: "#FBFBFA",
    borderColor: line,
    borderRadius: 22,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  mediaPickerActive: {
    backgroundColor: smoke,
    borderColor: deepLine,
  },
  mediaPickerText: {
    color: muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  mediaPickerTitle: {
    color: ink,
    fontSize: 15,
    fontWeight: "900",
  },
  miniInput: {
    backgroundColor: "#FBFBFA",
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    color: ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  miniMap: {
    backgroundColor: faint,
    borderColor: "rgba(20,20,20,0.08)",
    borderRadius: 24,
    borderWidth: 1,
    height: 170,
    marginTop: 14,
    overflow: "hidden",
  },
  nav: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(225,223,218,0.9)",
    borderRadius: 34,
    borderWidth: 1,
    bottom: 18,
    elevation: 8,
    flexDirection: "row",
    gap: 6,
    left: 18,
    padding: 8,
    position: "absolute",
    right: 18,
    shadowColor: ink,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  peopleGrid: {
    gap: 12,
  },
  personalBlock: {
    gap: 12,
  },
  presenceFill: {
    backgroundColor: ink,
    borderRadius: 999,
    height: "100%",
  },
  presenceTrack: {
    backgroundColor: "#DCDAD5",
    borderRadius: 999,
    height: 8,
    marginTop: 18,
    overflow: "hidden",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  replyButton: {
    backgroundColor: faint,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  replyText: {
    color: ink,
    fontSize: 12,
    fontWeight: "900",
  },
  safe: {
    backgroundColor: canvas,
    flex: 1,
  },
  screen: {
    gap: 16,
    padding: 18,
    paddingBottom: 178,
  },
  sectionHeader: {
    paddingTop: 18,
  },
  sectionLabel: {
    color: muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: ink,
    fontSize: 35,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 39,
    marginTop: 8,
  },
  statCard: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 26,
    borderWidth: 1,
    flex: 1,
    minWidth: "46%",
    padding: 16,
    shadowColor: ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.035,
    shadowRadius: 18,
  },
  statLabel: {
    color: muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statValue: {
    color: ink,
    fontSize: 27,
    fontWeight: "900",
  },
  tab: {
    alignItems: "center",
    borderRadius: 26,
    flex: 1,
    paddingVertical: 15,
  },
  tabActive: {
    backgroundColor: ink,
  },
  tabText: {
    color: "#94908A",
    fontSize: 14,
    fontWeight: "900",
  },
  tabTextActive: {
    color: paper,
  },
  traceAuthor: {
    color: ink,
    fontSize: 16,
    fontWeight: "900",
  },
  traceAuthorWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  traceAvatar: {
    alignItems: "center",
    backgroundColor: ink,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  traceAvatarMedia: {
    backgroundColor: deepLine,
    borderColor: "#C7C4BE",
    borderWidth: 2,
  },
  traceAvatarText: {
    color: paper,
    fontSize: 14,
    fontWeight: "900",
  },
  traceCard: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    shadowColor: ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
  },
  traceCardCompact: {
    padding: 14,
  },
  traceCardMedia: {
    borderColor: deepLine,
    shadowColor: ink,
    shadowOpacity: 0.08,
  },
  traceCardViewed: {
    borderColor: line,
    shadowOpacity: 0.035,
  },
  traceContext: {
    color: muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  traceFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  traceImage: {
    borderRadius: 18,
    height: 160,
    marginTop: 14,
    width: "100%",
  },
  traceList: {
    gap: 12,
  },
  traceMeta: {
    color: muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  traceText: {
    color: "#2B2926",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 27,
    marginTop: 15,
  },
  traceTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  visibilityPill: {
    backgroundColor: "#FBFBFA",
    borderColor: line,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  visibilityPillActive: {
    backgroundColor: ink,
    borderColor: ink,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  visibilityText: {
    color: muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  visibilityTextActive: {
    color: paper,
  },
  youAvatar: {
    alignItems: "center",
    backgroundColor: ink,
    borderRadius: 29,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  youAvatarText: {
    color: paper,
    fontSize: 20,
    fontWeight: "900",
  },
  youHero: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 32,
    borderWidth: 1,
    padding: 18,
    shadowColor: ink,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
  },
  youIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  youMeta: {
    color: muted,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  youName: {
    color: ink,
    fontSize: 23,
    fontWeight: "900",
  },
});
