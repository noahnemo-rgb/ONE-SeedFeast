import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

const ways = [
  { title: "Sell", detail: "Packets, roots, and plants at a grower’s price" },
  { title: "Trade", detail: "Swap for a variety you are missing" },
  { title: "Share", detail: "Pass along extras, cuttings, and starts" },
  { title: "Gift", detail: "Give an heirloom away, no charge" },
];

function exchangeLabel(listing) {
  if (listing.listing_type === "request") return "Looking for";
  if (listing.exchange_type === "sell") {
    return listing.price ? `$${Number(listing.price).toFixed(2)}` : "Sell";
  }
  if (listing.exchange_type === "trade") return "Trade";
  return "Gift";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const {
    data: listings,
    isLoading: loadingListings,
    refetch: refetchListings,
  } = useQuery({
    queryKey: ["homeListings"],
    queryFn: async () => {
      const response = await fetch("/api/seeds/listings");
      if (!response.ok) throw new Error("Failed to fetch listings");
      return response.json();
    },
  });

  const {
    data: recipes,
    isLoading: loadingRecipes,
    refetch: refetchRecipes,
  } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const response = await fetch("/api/recipes");
      if (!response.ok) throw new Error("Failed to fetch recipes");
      return response.json();
    },
  });

  const onRefresh = () => {
    refetchListings();
    refetchRecipes();
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B1718" />
      </View>
    );
  }

  const openListings = Array.isArray(listings) ? listings.slice(0, 3) : [];
  const recipeNotes = Array.isArray(recipes) ? recipes.slice(0, 4) : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <Image
            source={{ uri: "/seedfeast-logo.jpg" }}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Seed Feast Gourmet"
          />
          <Text style={styles.eyebrow}>Worldwide community vault</Text>
          <Text style={styles.title}>A seed vault the world keeps together.</Text>
          <Text style={styles.lede}>
            Sell, trade, share, and gift lost ancient and heirloom seeds, roots,
            cuttings, and plants. Listings move from grower to grower, a
            community exchange spread worldwide.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(tabs)/seeds")}
          >
            <Text style={styles.primaryButtonText}>Browse the vault</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/create-seed-listing")}
          >
            <Text style={styles.secondaryButtonText}>Offer a listing</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How the exchange works</Text>
          <View style={styles.wayGrid}>
            {ways.map((way) => (
              <TouchableOpacity
                key={way.title}
                style={styles.wayCard}
                onPress={() => router.push("/(tabs)/seeds")}
              >
                <Text style={styles.wayTitle}>{way.title}</Text>
                <Text style={styles.wayDetail}>{way.detail}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open in the exchange</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/seeds")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {loadingListings ? (
            <ActivityIndicator color="#8A3E24" />
          ) : (
            openListings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                onPress={() => router.push(`/seed/${listing.id}`)}
              >
                {listing.image ? (
                  <Image
                    source={{ uri: listing.image }}
                    style={styles.listingImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.listingImage, styles.listingFallback]} />
                )}
                <View style={styles.listingBody}>
                  <Text style={styles.listingTitle} numberOfLines={2}>
                    {listing.title}
                  </Text>
                  <Text style={styles.listingMeta} numberOfLines={1}>
                    {exchangeLabel(listing)}
                    {listing.location_city ? ` · ${listing.location_city}` : ""}
                    {listing.heirloom ? " · Heirloom" : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.heritage}>
          <Text style={styles.heritageEyebrow}>Culinary heritage</Text>
          <Text style={styles.heritageTitle}>Gourmet is the flavor in the seed</Text>
          <Text style={styles.heritageBody}>
            Gourmet names the culinary heritage in the seed — the flavor a variety
            was kept alive for. Recipes stay here when you cook what you grew or
            were given.
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/search")}>
            <Text style={styles.heritageLink}>Recipe notes</Text>
          </TouchableOpacity>
          {loadingRecipes ? null : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recipeScroll}
            >
              {recipeNotes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeCard}
                  onPress={() => router.push(`/recipe/${recipe.id}`)}
                >
                  <Image
                    source={{ uri: recipe.image }}
                    style={styles.recipeImage}
                    contentFit="cover"
                  />
                  <Text style={styles.recipeTitle} numberOfLines={1}>
                    {recipe.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F59C70",
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    backgroundColor: "#F59C70",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  logo: {
    width: "100%",
    height: 192,
    backgroundColor: "#F59C70",
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
    color: "#3B1718",
    marginTop: 4,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    color: "#3B1718",
    marginTop: 8,
  },
  lede: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#3B1718",
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#3B1718",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF6EF",
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#3B1718",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#3B1718",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#111111",
    marginBottom: 12,
  },
  seeAll: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#8A3E24",
    marginBottom: 12,
  },
  wayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  wayCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
  },
  wayTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#3B1718",
  },
  wayDetail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#6B534C",
    marginTop: 4,
  },
  listingCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  listingImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  listingFallback: {
    backgroundColor: "#F59C70",
  },
  listingBody: {
    flex: 1,
    justifyContent: "center",
  },
  listingTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#111111",
  },
  listingMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#6B534C",
    marginTop: 4,
  },
  heritage: {
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7D9D2",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  heritageEyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8A3E24",
  },
  heritageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#111111",
    marginTop: 4,
  },
  heritageBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B534C",
    marginTop: 6,
  },
  heritageLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#8A3E24",
    marginTop: 10,
    textDecorationLine: "underline",
  },
  recipeScroll: {
    gap: 12,
    paddingTop: 14,
  },
  recipeCard: {
    width: 148,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F8F8F8",
  },
  recipeImage: {
    width: "100%",
    height: 80,
  },
  recipeTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#111111",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
