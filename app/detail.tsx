import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TMDB_API_KEY = '9fc37c0f86fa2e6f6abccc3d53875667';

export default function DetailScreen() {
  const { id, type } = useLocalSearchParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState(false);
  const [fav, setFav] = useState(false);
  const [providers, setProviders] = useState([]);
  const [trailer, setTrailer] = useState(null);
  const [cast, setCast] = useState([]);

  const realId = type === 'show' ? parseInt(id) - 100000 : parseInt(id);
  const endpoint = type === 'show' ? 'tv' : 'movie';

  useEffect(() => {
    (async () => {
      try {
        const [detailRes, providerRes, videoRes, creditsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/${endpoint}/${realId}?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${realId}/watch/providers?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${realId}/videos?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${realId}/credits?api_key=${TMDB_API_KEY}`),
        ]);

        const detail = await detailRes.json();
        const providerData = await providerRes.json();
        const videoData = await videoRes.json();
        const creditsData = await creditsRes.json();

        setItem(detail);

        const inProviders = providerData.results?.IN?.flatrate || providerData.results?.IN?.rent || [];
        setProviders(inProviders.slice(0, 5));

        const yt = (videoData.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
        setTrailer(yt);

        setCast((creditsData.cast || []).slice(0, 8));

        const w = await AsyncStorage.getItem('watched');
        const f = await AsyncStorage.getItem('favs');
        if (w) setWatched(JSON.parse(w).includes(parseInt(id)));
        if (f) setFav(JSON.parse(f).includes(parseInt(id)));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const toggleWatched = async () => {
    const w = await AsyncStorage.getItem('watched');
    const arr = w ? JSON.parse(w) : [];
    const next = arr.includes(parseInt(id)) ? arr.filter(x => x !== parseInt(id)) : [...arr, parseInt(id)];
    await AsyncStorage.setItem('watched', JSON.stringify(next));
    setWatched(!watched);
  };

  const toggleFav = async () => {
    const f = await AsyncStorage.getItem('favs');
    const arr = f ? JSON.parse(f) : [];
    const next = arr.includes(parseInt(id)) ? arr.filter(x => x !== parseInt(id)) : [...arr, parseInt(id)];
    await AsyncStorage.setItem('favs', JSON.stringify(next));
    setFav(!fav);
  };

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator size="large" color="#f7b731" style={{ marginTop: 100 }} />
    </SafeAreaView>
  );

  if (!item) return (
    <SafeAreaView style={styles.safe}>
      <Text style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Not found</Text>
    </SafeAreaView>
  );

  const title = item.title || item.name;
  const rating = Math.round(item.vote_average * 10) / 10;
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const filled = Math.round(rating / 2);
  const genres = (item.genres || []).map(g => g.name).join(' · ');
  const runtime = item.runtime ? `${item.runtime} min` : item.episode_run_time?.[0] ? `${item.episode_run_time[0]} min/ep` : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        {item.backdrop_path && (
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w780${item.backdrop_path}` }}
            style={styles.backdrop}
          />
        )}

        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Poster + Info */}
          <View style={styles.topRow}>
            {item.poster_path && (
              <Image source={{ uri: `https://image.tmdb.org/t/p/w342${item.poster_path}` }} style={styles.poster} />
            )}
            <View style={styles.info}>
              <Text style={styles.typeLabel}>{type === 'show' ? '📺 Series' : '🎬 Film'}</Text>
              <Text style={styles.title}>{title}</Text>
              <View style={{ flexDirection: 'row', gap: 2, marginBottom: 6 }}>
                {[1,2,3,4,5].map(i => (
                  <Text key={i} style={{ color: i <= filled ? '#FFD700' : '#444460', fontSize: 14 }}>★</Text>
                ))}
                <Text style={{ color: '#888899', fontSize: 12, marginLeft: 4 }}>{rating}/10</Text>
              </View>
              <Text style={styles.meta}>{year} {runtime ? `· ${runtime}` : ''}</Text>
              <Text style={styles.meta}>{genres}</Text>
            </View>
          </View>

          {/* Overview */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overview}>{item.overview}</Text>

          {/* OTT Providers */}
          {providers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Where to Watch in India</Text>
              <View style={styles.providerRow}>
                {providers.map(p => (
                  <View key={p.provider_id} style={styles.providerCard}>
                    <Image source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }} style={styles.providerLogo} />
                    <Text style={styles.providerName} numberOfLines={1}>{p.provider_name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Trailer */}
          {trailer && (
            <>
              <Text style={styles.sectionTitle}>Trailer</Text>
              <TouchableOpacity
                style={styles.trailerBtn}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}
              >
                <Text style={styles.trailerBtnText}>▶ Watch Trailer on YouTube</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cast.map(c => (
                  <View key={c.id} style={styles.castCard}>
                    {c.profile_path ? (
                      <Image source={{ uri: `https://image.tmdb.org/t/p/w92${c.profile_path}` }} style={styles.castPhoto} />
                    ) : (
                      <View style={[styles.castPhoto, { backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 24 }}>👤</Text>
                      </View>
                    )}
                    <Text style={styles.castName} numberOfLines={2}>{c.name}</Text>
                    <Text style={styles.castChar} numberOfLines={1}>{c.character}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.watchedBtn, watched && styles.watchedBtnDone]} onPress={toggleWatched}>
              <Text style={[styles.watchedBtnText, watched && { color: '#444460' }]}>{watched ? '✓ Watched' : 'Mark Watched'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.favBtn, fav && styles.favBtnActive]} onPress={toggleFav}>
              <Text style={{ fontSize: 20, color: fav ? '#f7b731' : '#444460' }}>{fav ? '★' : '☆'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a18' },
  backdrop: { width: '100%', height: 380, opacity: 0.6 },
  backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: '#00000088', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  backText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 16 },
  topRow: { flexDirection: 'row', gap: 14, marginBottom: 20, marginTop: -40 },
  poster: { width: 110, height: 165, borderRadius: 10, borderWidth: 2, borderColor: '#f7b731' },
  info: { flex: 1, justifyContent: 'flex-end', paddingBottom: 4 },
  typeLabel: { color: '#f7b731', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 6, lineHeight: 22 },
  meta: { color: '#888899', fontSize: 11, marginBottom: 2 },
  sectionTitle: { color: '#f7b731', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  overview: { color: '#ccc', fontSize: 13, lineHeight: 20 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  providerCard: { alignItems: 'center', width: 60 },
  providerLogo: { width: 48, height: 48, borderRadius: 10 },
  providerName: { color: '#888899', fontSize: 9, marginTop: 4, textAlign: 'center' },
  trailerBtn: { backgroundColor: '#e74c3c', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  trailerBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  castCard: { width: 80, marginRight: 12, alignItems: 'center' },
  castPhoto: { width: 70, height: 70, borderRadius: 35, marginBottom: 6 },
  castName: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  castChar: { color: '#888899', fontSize: 9, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 24, marginBottom: 40 },
  watchedBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#11998e' },
  watchedBtnDone: { backgroundColor: '#222' },
  watchedBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  favBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' },
  favBtnActive: { borderColor: '#f7b731', backgroundColor: '#f7b73115' },
});
