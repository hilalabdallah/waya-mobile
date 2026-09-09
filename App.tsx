import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

type TraceComment = {
  id: string;
  author: string;
  text: string;
  emoji?: string;
  createdAt: string;
};

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
  comments?: TraceComment[];
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
const violet = "#8B5CF6";
const softViolet = "#F4EFFF";

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
    comments: [
      {
        id: "comment-1",
        author: "Ness",
        text: "Je vois exactement le genre de journee.",
        emoji: "!",
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      },
    ],
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
    comments: [],
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
    comments: [],
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
    comments: [
      {
        id: "comment-2",
        author: "As",
        text: "Garde ce moment.",
        emoji: "*",
        createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      },
    ],
  },
];

const friends = ["As", "Nolan", "Zer", "Maya", "Yanis", "Lina"];
const friendTimes = ["18 min", "1 h", "2 h", "hier", "2 j", "3 j"];
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
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const presence = useMemo(() => computePresence(traces, lastActiveAt), [lastActiveAt, traces]);
  const sortedTraces = useMemo(
    () => [...traces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [traces],
  );
  const myTraces = useMemo(() => sortedTraces.filter((trace) => trace.isMine), [sortedTraces]);
  const selectedTrace = useMemo(
    () => sortedTraces.find((trace) => trace.id === selectedTraceId),
    [selectedTraceId, sortedTraces],
  );

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

  function answerTrace(trace: Trace, text?: string, emoji?: string) {
    const nextComment =
      text || emoji
        ? {
            id: `comment-${Date.now()}`,
            author: "Ness",
            text: text?.trim() || "A reagi a cette trace.",
            emoji,
            createdAt: new Date().toISOString(),
          }
        : undefined;

    setLastActiveAt(new Date().toISOString());
    setTraces((current) =>
      current.map((item) =>
        item.id === trace.id
          ? {
              ...item,
              comments: nextComment ? [...(item.comments ?? []), nextComment] : item.comments ?? [],
              replies: item.replies + 1,
            }
          : item,
      ),
    );
    setReplyTargetId(null);
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
                  onAnswer={(text, emoji) => answerTrace(trace, text, emoji)}
                  onLongPress={() => setReplyTargetId((current) => (current === trace.id ? null : trace.id))}
                  onOpenMedia={() => openMedia(trace)}
                  onPress={() => setSelectedTraceId((current) => (current === trace.id ? null : trace.id))}
                  replying={replyTargetId === trace.id}
                  trace={trace}
                  viewed={viewedMedia.includes(trace.id)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        {view === "circle" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <ScreenTitle label="Entourage" title="Ceux qui comptent" />
            <View style={styles.peopleGrid}>
              {friends.map((name, index) => (
                <View key={name} style={styles.friendCard}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendInitial}>{name[0]}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{name}</Text>
                    <Text style={styles.friendMeta}>{friendTimes[index]}</Text>
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
                      onAnswer={(text, emoji) => answerTrace(trace, text, emoji)}
                      onLongPress={() => setReplyTargetId((current) => (current === trace.id ? null : trace.id))}
                      onOpenMedia={() => openMedia(trace)}
                      onPress={() => setSelectedTraceId((current) => (current === trace.id ? null : trace.id))}
                      replying={replyTargetId === trace.id}
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

      {selectedTrace && (
        <TraceOverlay
          close={() => setSelectedTraceId(null)}
          onAnswer={(text, emoji) => answerTrace(selectedTrace, text, emoji)}
          onLongPress={() => setReplyTargetId(selectedTrace.id)}
          replying={replyTargetId === selectedTrace.id}
          trace={selectedTrace}
        />
      )}

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

function TraceOverlay({
  close,
  onAnswer,
  onLongPress,
  replying,
  trace,
}: {
  close: () => void;
  onAnswer: (text?: string, emoji?: string) => void;
  onLongPress: () => void;
  replying: boolean;
  trace: Trace;
}) {
  const comments = trace.comments ?? [];
  const interactions = trace.replies + comments.length;

  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible>
      <Pressable onPress={close} style={styles.overlayBackdrop}>
        <Pressable delayLongPress={850} onLongPress={onLongPress} style={styles.overlaySheet}>
          <View style={styles.overlayTrace}>
            <View style={styles.traceTop}>
              <View style={styles.traceAuthorWrap}>
                <View style={styles.traceAvatar}>
                  <Text style={styles.traceAvatarText}>{trace.author[0]}</Text>
                </View>
                <View>
                  <Text style={styles.traceAuthor}>{trace.author}</Text>
                  <Text style={styles.traceMeta}>{formatTraceTime(trace.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.overlayInteraction}>{interactions} interactions</Text>
            </View>
            <Text style={styles.overlayText}>{trace.text}</Text>
            {replying && <TraceReplyBox onAnswer={onAnswer} />}
          </View>

          {comments.length > 0 && (
            <View style={styles.commentList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <Text style={styles.commentEmoji}>{comment.emoji || "-"}</Text>
                  <View style={styles.commentBody}>
                    <Text style={styles.commentAuthor}>{comment.author}</Text>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TraceCard({
  compact,
  onAnswer,
  onLongPress,
  onOpenMedia,
  onPress,
  replying,
  trace,
  viewed,
}: {
  compact?: boolean;
  onAnswer: (text?: string, emoji?: string) => void;
  onLongPress: () => void;
  onOpenMedia: () => void;
  onPress: () => void;
  replying: boolean;
  trace: Trace;
  viewed: boolean;
}) {
  const hasMedia = Boolean(trace.mediaKind);
  const interactions = trace.replies + (trace.comments?.length ?? 0);

  return (
    <Pressable
      delayLongPress={850}
      onLongPress={onLongPress}
      onPress={onPress}
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
            <Text style={styles.traceMeta}>{formatTraceTime(trace.createdAt)}</Text>
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
        {!trace.isMine && (
          <Pressable onPress={onLongPress} style={styles.replyButton}>
            <Text style={styles.replyText}>{interactions} interactions</Text>
          </Pressable>
        )}
      </View>

      {replying && <TraceReplyBox onAnswer={onAnswer} />}
    </Pressable>
  );
}

function TraceReplyBox({ onAnswer }: { onAnswer: (text?: string, emoji?: string) => void }) {
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<string | undefined>();

  function submit() {
    onAnswer(text, emoji);
    setText("");
    setEmoji(undefined);
  }

  return (
    <View style={styles.replyComposer}>
      <View style={styles.emojiRow}>
        {["+", "!", "*", "?"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setEmoji(item)}
            style={[styles.emojiButton, emoji === item && styles.emojiButtonActive]}
          >
            <Text style={[styles.emojiText, emoji === item && styles.emojiTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.replyInputRow}>
        <TextInput
          onChangeText={setText}
          placeholder="Repondre directement..."
          placeholderTextColor="#A4A09A"
          style={styles.replyInput}
          value={text}
        />
        <Pressable onPress={submit} style={styles.replySend}>
          <Text style={styles.replySendText}>OK</Text>
        </Pressable>
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
  const [place, setPlace] = useState("");

  function reset() {
    setText("");
    setVisibility("circle");
    setMediaKind(undefined);
    setMediaUri(undefined);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.composerBackdrop}
      >
        <View style={styles.composerCard}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.composerTop}>
            <View>
              <Text style={styles.composerTitle}>Trace</Text>
            </View>
            <Pressable onPress={closeAndReset} style={styles.closeButton}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <TextInput
            multiline
            onChangeText={setText}
            placeholder="Qu'est-ce que tu gardes ?"
            placeholderTextColor="#A4A09A"
            style={styles.input}
            value={text}
          />

          <View style={styles.composerTools}>
            <View style={styles.visibilityRow}>
              <VisibilityPill active={visibility === "private"} label="Prive" onPress={() => setVisibility("private")} />
              <VisibilityPill
                active={visibility === "circle"}
                label="Entourage"
                onPress={() => setVisibility("circle")}
              />
              <VisibilityPill active={visibility === "local"} label="Public" onPress={() => setVisibility("local")} />
            </View>

            <View style={styles.mediaIcons}>
              <Pressable onPress={addMedia} style={[styles.mediaIcon, mediaKind === "photo" && styles.mediaIconActive]}>
                <Text style={[styles.mediaIconText, mediaKind === "photo" && styles.mediaIconTextActive]}>P</Text>
              </Pressable>
              <Pressable onPress={addMedia} style={[styles.mediaIcon, mediaKind === "video" && styles.mediaIconActive]}>
                <Text style={[styles.mediaIconText, mediaKind === "video" && styles.mediaIconTextActive]}>V</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            onChangeText={setPlace}
            placeholder="lieu"
            placeholderTextColor="#A4A09A"
            style={styles.placeInput}
            value={place}
          />

          <Pressable onPress={submit} style={({ pressed }) => [styles.depositButton, pressed && styles.pressed]}>
            <Text style={styles.depositText}>Valider</Text>
          </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VisibilityPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.visibilityPill, active && styles.visibilityPillActive]}>
      <View style={[styles.visibilityCheck, active && styles.visibilityCheckActive]} />
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
  commentAuthor: {
    color: ink,
    fontSize: 13,
    fontWeight: "900",
  },
  commentBody: {
    flex: 1,
  },
  commentEmoji: {
    backgroundColor: ink,
    borderRadius: 999,
    color: violet,
    fontSize: 14,
    fontWeight: "900",
    height: 28,
    lineHeight: 28,
    overflow: "hidden",
    textAlign: "center",
    width: 28,
  },
  commentRow: {
    alignItems: "flex-start",
    backgroundColor: faint,
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  commentList: {
    gap: 10,
    marginTop: 12,
  },
  commentsClose: {
    alignItems: "center",
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  commentsCloseText: {
    color: ink,
    fontSize: 18,
    fontWeight: "900",
  },
  commentsLabel: {
    color: muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  commentsPanel: {
    backgroundColor: paper,
    borderColor: deepLine,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    shadowColor: ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  commentsTitle: {
    color: ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  commentsTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  commentText: {
    color: "#2B2926",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 2,
  },
  composeButton: {
    alignItems: "center",
    backgroundColor: violet,
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: 28,
    borderWidth: 4,
    bottom: 86,
    elevation: 10,
    height: 72,
    justifyContent: "center",
    left: "50%",
    marginLeft: -36,
    position: "absolute",
    shadowColor: violet,
    shadowOpacity: 0.28,
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
    maxHeight: "78%",
    padding: 18,
    paddingBottom: 18,
  },
  composerTitle: {
    color: ink,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 26,
  },
  composerTools: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
  },
  composerTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  depositButton: {
    alignItems: "center",
    backgroundColor: violet,
    borderRadius: 20,
    marginTop: 12,
    paddingVertical: 14,
  },
  depositText: {
    color: paper,
    fontSize: 15,
    fontWeight: "800",
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
  emojiButton: {
    alignItems: "center",
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  emojiButtonActive: {
    backgroundColor: violet,
    borderColor: violet,
  },
  emojiRow: {
    flexDirection: "row",
    gap: 8,
  },
  emojiText: {
    color: ink,
    fontSize: 16,
    fontWeight: "900",
  },
  emojiTextActive: {
    color: paper,
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
    fontSize: 17,
    fontWeight: "900",
  },
  friendSignal: {
    backgroundColor: smoke,
    borderRadius: 999,
    height: 8,
    width: 8,
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
    borderRadius: 22,
    borderWidth: 1,
    color: ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 14,
    minHeight: 118,
    padding: 16,
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
    backgroundColor: violet,
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
    backgroundColor: softViolet,
    borderColor: violet,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mediaBadgeText: {
    color: ink,
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
  mediaIcon: {
    alignItems: "center",
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  mediaIconActive: {
    backgroundColor: softViolet,
    borderColor: violet,
  },
  mediaIcons: {
    flexDirection: "row",
    gap: 8,
  },
  mediaIconText: {
    color: muted,
    fontSize: 14,
    fontWeight: "900",
  },
  mediaIconTextActive: {
    color: violet,
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
  overlayBackdrop: {
    backgroundColor: "rgba(8,9,10,0.28)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  overlayInteraction: {
    color: muted,
    fontSize: 12,
    fontWeight: "900",
  },
  overlaySheet: {
    gap: 0,
  },
  overlayText: {
    color: "#1E1D1B",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: 14,
  },
  overlayTrace: {
    backgroundColor: paper,
    borderColor: violet,
    borderRadius: 30,
    borderWidth: 1,
    padding: 17,
    shadowColor: ink,
    shadowOffset: { height: 20, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  peopleGrid: {
    gap: 12,
  },
  personalBlock: {
    gap: 12,
  },
  placeInput: {
    backgroundColor: "#FBFBFA",
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    color: ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  presenceFill: {
    backgroundColor: violet,
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
    backgroundColor: softViolet,
    borderColor: violet,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  replyComposer: {
    backgroundColor: faint,
    borderColor: line,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  replyInput: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 16,
    borderWidth: 1,
    color: ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  replySend: {
    alignItems: "center",
    backgroundColor: ink,
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 48,
  },
  replySendText: {
    color: paper,
    fontSize: 12,
    fontWeight: "900",
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
    color: ink,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: ink,
    fontSize: 29,
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
    fontSize: 24,
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
    borderColor: violet,
    borderWidth: 2,
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
    backgroundColor: ink,
    borderColor: violet,
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
    padding: 15,
    shadowColor: ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
  },
  traceCardCompact: {
    padding: 14,
  },
  traceCardMedia: {
    borderColor: violet,
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
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 13,
  },
  traceTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  visibilityPill: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 7,
  },
  visibilityPillActive: {
    backgroundColor: "transparent",
  },
  visibilityCheck: {
    backgroundColor: paper,
    borderColor: line,
    borderRadius: 999,
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  visibilityCheckActive: {
    backgroundColor: violet,
    borderColor: violet,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 12,
  },
  visibilityText: {
    color: muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  visibilityTextActive: {
    color: ink,
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
