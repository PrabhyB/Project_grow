import { useNavigate } from "react-router-dom";
import AttentionSection from "../components/AttentionSection";
//import type { AttentionItem } from "../components/AttentionSection";
import { auth } from "../lib/firebase";
import { logoutUser } from "../services/authService";
import "./DashboardPage.css";
import PropertyMap from "../components/property-map/PropertyMap";
import type { GardenZone } from "../components/property-map/PropertyMap";
import { useEffect, useState } from "react";
import GardenDetailsPanel from "../components/property-map/GardenDetailsPanel";
import { useWeather } from "../hooks/useWeather";
import WeatherSummaryCard from "../components/WeatherSummaryCard";
import WeatherForecastStrip from "../components/WeatherForecastStrip";
import {
  subscribeToGardenPlants,
  type GardenPlant,
} from "../services/plantService";
import {
  buildAttentionItems,
} from "../services/dashboardAttentionService";
import {
  createGardenArea,
  deleteGardenArea,
  ensureDefaultGardens,
  subscribeToGardens,
  updateGardenArea,
  type GardenArea,
} from "../services/gardenService";

import {
  createPropertyObject,
  deletePropertyObject,
  subscribeToPropertyObjects,
  updatePropertyObject,
  type PropertyObject,
  type PropertyObjectType,
} from "../services/propertyObjectService";

type DashboardPlant = GardenPlant & {
  gardenId: string;
  gardenName: string;
};



export default function DashboardPage() {
  const navigate = useNavigate();
  const {
  forecast,
  isLoading: isLoadingWeather,
  error: weatherError,
  reloadWeather,
} = useWeather();

  const [dashboardPlants, setDashboardPlants] = useState<
  DashboardPlant[]
>([]);

const [gardens, setGardens] = useState<GardenArea[]>([]);
const [gardensAreReady, setGardensAreReady] =
  useState(false);

  const [selectedGarden, setSelectedGarden] =
  useState<GardenZone | null>(null);

  const [propertyObjects, setPropertyObjects] =
  useState<PropertyObject[]>([]);

  const userName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "Gardener";

    const todayWeather = forecast?.daily[0];
const tomorrowWeather = forecast?.daily[1];

const expectedRainMm =
  (todayWeather?.precipitationMm ?? 0) +
  (tomorrowWeather?.precipitationMm ?? 0);

const attentionItems = buildAttentionItems(
  dashboardPlants,
  {
    temperatureC: forecast?.current.temperatureC,

    sunlightHours:
      todayWeather?.sunshineDurationSeconds !== undefined
        ? todayWeather.sunshineDurationSeconds / 3600
        : undefined,

    expectedRainMm,
  },
);

const attentionCount = attentionItems.length;
  async function handleLogout() {
    await logoutUser();
    navigate("/login");
  }

  const liveGardenZones: GardenZone[] = gardens.map(
  (garden) => {
    const gardenPlants = dashboardPlants.filter(
      (plant) => plant.gardenId === garden.id,
    );

    const gardenAlerts = attentionItems.filter(
      (item) => item.gardenId === garden.id,
    );

    return {
      id: garden.id,
      name: garden.name,
      type: garden.type,
      x: garden.x,
      y: garden.y,
      width: garden.width,
      height: garden.height,
      plantCount: gardenPlants.length,
      alerts: gardenAlerts.length,
    };
  },
);

useEffect(() => {
  let unsubscribe: (() => void) | undefined;
  let isCancelled = false;

  async function initialiseGardens() {
    try {
      await ensureDefaultGardens();

      if (isCancelled) {
        return;
      }

      unsubscribe = subscribeToGardens(
        (loadedGardens) => {
          setGardens(loadedGardens);
          setGardensAreReady(true);
        },
        (error) => {
          console.error(
            "Unable to load gardens:",
            error,
          );
          setGardensAreReady(true);
        },
      );
    } catch (error) {
      console.error(
        "Unable to initialise gardens:",
        error,
      );
      setGardensAreReady(true);
    }
  }

  void initialiseGardens();

  return () => {
    isCancelled = true;
    unsubscribe?.();
  };
}, []);

 useEffect(() => {
  if (!gardensAreReady) {
    return;
  }

  if (gardens.length === 0) {
    setDashboardPlants([]);
    return;
  }

  const plantsByGarden: Record<
    string,
    GardenPlant[]
  > = {};

  const unsubscribes = gardens.map((garden) =>
    subscribeToGardenPlants(
      garden.id,
      (loadedPlants) => {
        plantsByGarden[garden.id] = loadedPlants;

        const combinedPlants = gardens.flatMap(
          (gardenArea) =>
            (
              plantsByGarden[gardenArea.id] ?? []
            ).map((plant) => ({
              ...plant,
              gardenId: gardenArea.id,
              gardenName: gardenArea.name,
            })),
        );

        setDashboardPlants(combinedPlants);
      },
      (error) => {
        console.error(
          `Unable to load plants from ${garden.name}:`,
          error,
        );
      },
    ),
  );

  return () => {
    unsubscribes.forEach((unsubscribe) => {
      unsubscribe();
    });
  };
}, [gardens, gardensAreReady]);

useEffect(() => {
  const unsubscribe =
    subscribeToPropertyObjects(
      (objects) => {
        setPropertyObjects(objects);
      },
      (error) => {
        console.error(
          "Unable to load property objects:",
          error,
        );
      },
    );

  return unsubscribe;
}, []);

async function handleCreateGardenArea() {
  try {
    const areaNumber = gardens.length + 1;

    const offset = (gardens.length * 30) % 180;

    await createGardenArea({
      name: `Growing Area ${areaNumber}`,
      description: "Custom growing area.",
      type: "garden",

      x: 500 + offset,
      y: 360 + offset / 2,

      width: 180,
      height: 130,
    });
  } catch (error) {
    console.error(
      "Unable to create growing area:",
      error,
    );
  }
}

async function handleMoveGardenArea(
  gardenId: string,
  x: number,
  y: number,
) {
  try {
    await updateGardenArea(gardenId, {
      x,
      y,
    });
  } catch (error) {
    console.error(
      "Unable to save garden position:",
      error,
    );
  }
}

async function handleResizeGardenArea(
  gardenId: string,
  width: number,
  height: number,
) {
  try {
    await updateGardenArea(gardenId, {
      width,
      height,
    });
  } catch (error) {
    console.error(
      "Unable to save garden size:",
      error,
    );
  }
}

async function handleCreatePropertyObject(
  type: PropertyObjectType,
) {
  try {
    if (type === "tree") {
      await createPropertyObject({
  type: "tree",
  name: "Tree",
  x: 700,
  y: 100,
  width: 90,
  height: 90,
  rotation: 0,
  physicalHeightM: 4,
});

      return;
    }

    if (type === "fence") {
      await createPropertyObject({
  type: "fence",
  name: "Fence",
  x: 550,
  y: 520,
  width: 220,
  height: 14,
  rotation: 0,
  physicalHeightM: 1.8,
});

      return;
    }
  } catch (error) {
    console.error(
      "Unable to create property object:",
      error,
    );
  }
}

async function handleMovePropertyObject(
  objectId: string,
  x: number,
  y: number,
) {
  try {
    await updatePropertyObject(objectId, {
      x,
      y,
    });
  } catch (error) {
    console.error(
      "Unable to save property object position:",
      error,
    );
  }
}

async function handleResizePropertyObject(
  objectId: string,
  width: number,
  height: number,
) {
  try {
    await updatePropertyObject(objectId, {
      width,
      height,
    });
  } catch (error) {
    console.error(
      "Unable to save property object size:",
      error,
    );
  }
}
async function handleRotatePropertyObject(
  objectId: string,
  rotation: number,
) {
  try {
    await updatePropertyObject(objectId, {
      rotation,
    });
  } catch (error) {
    console.error(
      "Unable to save property object rotation:",
      error,
    );
  }
}

async function handleDeleteGardenArea(
  zone: GardenZone,
) {
  if (zone.plantCount > 0) {
    window.alert(
      `${zone.name} still contains ${
        zone.plantCount
      } ${
        zone.plantCount === 1
          ? "plant"
          : "plants"
      }. Move or remove those plants before deleting the growing area.`,
    );

    return;
  }

  const confirmed = window.confirm(
    `Delete "${zone.name}"?\n\nThis cannot be undone.`,
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteGardenArea(zone.id);

    if (selectedGarden?.id === zone.id) {
      setSelectedGarden(null);
    }
  } catch (error) {
    console.error(
      "Unable to delete growing area:",
      error,
    );
  }
}

async function handleDeletePropertyObject(
  object: PropertyObject,
) {
  const confirmed = window.confirm(
    `Delete "${object.name}"?\n\nThis cannot be undone.`,
  );

  if (!confirmed) {
    return;
  }

  try {
    await deletePropertyObject(
      object.id,
    );
  } catch (error) {
    console.error(
      "Unable to delete property object:",
      error,
    );
  }
}

async function handlePropertyObjectHeightChange(
  objectId: string,
  physicalHeightM: number,
) {
  try {
    await updatePropertyObject(
      objectId,
      {
        physicalHeightM,
      },
    );
  } catch (error) {
    console.error(
      "Unable to save object height:",
      error,
    );
  }
}

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-leaf">🌿</span>
          <span>GrowHub</span>
        </div>

        <div className="header-actions">
          <button
            className="notification-button"
            type="button"
            aria-label="Notifications"
          >
            🔔
            {attentionCount > 0 && (
  <span className="notification-count">
    {attentionCount}
  </span>
)}
          </button>

          <button className="profile-button" type="button">
            <span className="profile-avatar">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span>{userName}</span>
          </button>

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <div>
            <p className="eyebrow">Your garden today</p>

            <h1>Good morning, {userName} 🌱</h1>

            <p className="daily-summary">
  {attentionCount === 0 ? (
    <>Your garden has no urgent tasks today.</>
  ) : (
    <>
      You have{" "}
      <strong>
        {attentionCount}{" "}
        {attentionCount === 1 ? "task" : "tasks"}
      </strong>{" "}
      waiting today.
    </>
  )}
</p>

            <p className="garden-highlight">
              Your tomatoes are nearly ready to harvest. 🍅
            </p>
          </div>

          <WeatherSummaryCard
  forecast={forecast}
  isLoading={isLoadingWeather}
  error={weatherError}
  onRetry={reloadWeather}
/>
        </section>

        {forecast && (
  <WeatherForecastStrip days={forecast.daily} />
)}


        <AttentionSection
  items={attentionItems}
  onAction={(item) => {
    navigate(
      `/garden/${item.gardenId}/plant/${item.plantId}`,
    );
  }}
/>
        <PropertyMap
  zones={liveGardenZones}
  propertyObjects={propertyObjects}
  selectedZoneId={selectedGarden?.id}
  onSelectZone={(zone) => {
    setSelectedGarden(zone);
  }}
  onCreateZone={handleCreateGardenArea}
  onMoveZone={handleMoveGardenArea}
  onResizeZone={handleResizeGardenArea}
  onCreatePropertyObject={
    handleCreatePropertyObject
  }
  onMovePropertyObject={
    handleMovePropertyObject
  }
  onResizePropertyObject={
    handleResizePropertyObject
  }
  onRotatePropertyObject={
  handleRotatePropertyObject
}

onDeleteZone={handleDeleteGardenArea}
onDeletePropertyObject={
  handleDeletePropertyObject
}

onChangePropertyObjectHeight={
  handlePropertyObjectHeightChange
}
/>
      </main>
      {selectedGarden && (
  <GardenDetailsPanel
    zone={selectedGarden}
    onClose={() => setSelectedGarden(null)}
    onOpenGarden={(zone) => {
      navigate(`/garden/${zone.id}`);
    }}
  />
)}
    </div>
  );
}
