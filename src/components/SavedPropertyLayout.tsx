import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  subscribeToPropertyConfig,
  subscribeToPropertySpaces,
  type PropertyConfig,
  type PropertyPoint,
  type PropertySpace,
} from "../services/propertyService";

import {
  subscribeToPropertyObjects,
  type PropertyObject,
} from "../services/propertyObjectService";

import "./SavedPropertyLayout.css";

type SavedPropertyLayoutProps = {
  fallback?: ReactNode;
};

function getBoundarySize(
  boundary: PropertyPoint[],
) {
  if (
    boundary.length === 0
  ) {
    return {
      width: 1,
      depth: 1,
    };
  }

  const xs =
    boundary.map(
      (point) => point.x,
    );

  const ys =
    boundary.map(
      (point) => point.y,
    );

  return {
    width:
      Math.max(...xs) -
        Math.min(...xs) ||
      1,

    depth:
      Math.max(...ys) -
        Math.min(...ys) ||
      1,
  };
}

export default function SavedPropertyLayout({
  fallback,
}: SavedPropertyLayoutProps) {
  const [
    config,
    setConfig,
  ] =
    useState<PropertyConfig | null>(
      null,
    );

  const [
    spaces,
    setSpaces,
  ] =
    useState<PropertySpace[]>([]);

  const [
    objects,
    setObjects,
  ] =
    useState<PropertyObject[]>([]);

  const [
    hasLoaded,
    setHasLoaded,
  ] = useState(false);

  useEffect(() => {
    let configLoaded = false;
    let spacesLoaded = false;
    let objectsLoaded = false;

    const updateLoaded =
      () => {
        if (
          configLoaded &&
          spacesLoaded &&
          objectsLoaded
        ) {
          setHasLoaded(true);
        }
      };

    const unsubscribeConfig =
      subscribeToPropertyConfig(
        (nextConfig) => {
          configLoaded = true;

          setConfig(
            nextConfig,
          );

          updateLoaded();
        },
        (error) => {
          console.error(
            "Unable to load property config:",
            error,
          );

          configLoaded = true;
          updateLoaded();
        },
      );

    const unsubscribeSpaces =
      subscribeToPropertySpaces(
        (nextSpaces) => {
          spacesLoaded = true;

          setSpaces(
            nextSpaces,
          );

          updateLoaded();
        },
        (error) => {
          console.error(
            "Unable to load property spaces:",
            error,
          );

          spacesLoaded = true;
          updateLoaded();
        },
      );

    const unsubscribeObjects =
      subscribeToPropertyObjects(
        (nextObjects) => {
          objectsLoaded = true;

          setObjects(
            nextObjects,
          );

          updateLoaded();
        },
        (error) => {
          console.error(
            "Unable to load property objects:",
            error,
          );

          objectsLoaded = true;
          updateLoaded();
        },
      );

    return () => {
      unsubscribeConfig();
      unsubscribeSpaces();
      unsubscribeObjects();
    };
  }, []);

  const structure =
    useMemo(
      () =>
        objects.find(
          (object) =>
            object.id ===
            "setup-main-structure",
        ) ?? null,
      [objects],
    );

  if (!hasLoaded) {
    return (
      <>
        {fallback}
      </>
    );
  }

  if (
    !config?.setupComplete ||
    spaces.length === 0
  ) {
    return (
      <>
        {fallback}
      </>
    );
  }

  const dimensions: number[] =
    [];

  spaces.forEach((space) => {
    dimensions.push(
      space.widthM,
      space.depthM,
    );
  });

  if (
    structure?.boundary
  ) {
    const size =
      getBoundarySize(
        structure.boundary,
      );

    dimensions.push(
      size.width,
      size.depth,
    );
  }

  const largestDimension =
    Math.max(
      10,
      ...dimensions,
    );

  const pixelsPerMetre =
    Math.max(
      8,
      Math.min(
        32,
        420 /
          largestDimension,
      ),
    );

  return (
    <section className="saved-property-layout-card">
      <div className="saved-property-layout-heading">
        <div>
          <h2>
            Your property
          </h2>

          <p>
            Your saved GrowHub
            property layout.
          </p>
        </div>
      </div>

      <div className="saved-property-layout-canvas">
        <div
          className="saved-layout-north"
          style={{
            transform: `rotate(${
              config.northRotation ??
              0
            }deg)`,
          }}
        >
          ↑
          <span>N</span>
        </div>

        {structure?.boundary &&
          structure.layoutX !==
            undefined &&
          structure.layoutY !==
            undefined &&
          (() => {
            const size =
              getBoundarySize(
                structure.boundary!,
              );

            return (
              <div
                className="saved-layout-item saved-layout-structure"
                style={{
                  left: `${
                    structure.layoutX! *
                    100
                  }%`,

                  top: `${
                    structure.layoutY! *
                    100
                  }%`,

                  width: `${
                    size.width *
                    pixelsPerMetre
                  }px`,

                  height: `${
                    size.depth *
                    pixelsPerMetre
                  }px`,
                }}
              >
                <div
                  className="saved-layout-rotatable"
                  style={{
                    transform: `rotate(${
                      structure.rotation ??
                      0
                    }deg)`,
                  }}
                >
                  <svg
                    viewBox={`0 0 ${size.width} ${size.depth}`}
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={structure.boundary!
                        .map(
                          (
                            point,
                          ) =>
                            `${point.x},${point.y}`,
                        )
                        .join(" ")}
                    />
                  </svg>
                </div>

                <strong>
                  {structure.name}
                </strong>

                <small>
                  {size.width}m ×{" "}
                  {size.depth}m
                </small>
              </div>
            );
          })()}

        {spaces.map(
          (space) => {
            if (
              !space.boundary ||
              space.layoutX ===
                undefined ||
              space.layoutY ===
                undefined
            ) {
              return null;
            }

            return (
              <div
                key={space.id}
                className="saved-layout-item saved-layout-space"
                style={{
                  left: `${
                    space.layoutX *
                    100
                  }%`,

                  top: `${
                    space.layoutY *
                    100
                  }%`,

                  width: `${
                    space.widthM *
                    pixelsPerMetre
                  }px`,

                  height: `${
                    space.depthM *
                    pixelsPerMetre
                  }px`,
                }}
              >
                <div
                  className="saved-layout-rotatable"
                  style={{
                    transform: `rotate(${
                      space.rotation ??
                      0
                    }deg)`,
                  }}
                >
                  <svg
                    viewBox={`0 0 ${space.widthM} ${space.depthM}`}
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={space.boundary
                        .map(
                          (
                            point,
                          ) =>
                            `${point.x},${point.y}`,
                        )
                        .join(" ")}
                    />
                  </svg>
                </div>

                <strong>
                  {space.name}
                </strong>

                <small>
                  {space.widthM}m ×{" "}
                  {space.depthM}m
                </small>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}