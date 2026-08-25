import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
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
  createPropertyObject,
  deletePropertyObject,
  subscribeToPropertyObjects,
  updatePropertyObject,
  type PropertyObject,
} from "../services/propertyObjectService";

import "./SavedPropertyLayout.css";

type SavedPropertyLayoutProps = {
  fallback?: ReactNode;
};

type ObjectDraft = {
  id: string;
  widthM: string;
  depthM: string;
  rotation: string;
  physicalHeightM: string;
};

type ObjectDrag = {
  id: string;
  offsetX: number;
  offsetY: number;
} | null;

type ObjectDragPreview = {
  id: string;
  x: number;
  y: number;
} | null;

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

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

function getObjectSize(
  object: PropertyObject,
) {
  return {
    widthM:
      object.widthM ??
      Math.max(
        0.2,
        object.width / 20,
      ),

    depthM:
      object.depthM ??
      Math.max(
        0.2,
        object.height / 20,
      ),
  };
}

function getObjectPosition(
  object: PropertyObject,
) {
  /*
   * New objects use normalized
   * layout coordinates.
   *
   * The fallback converts objects
   * created by the older map.
   */
  return {
    x:
      object.layoutX ??
      clamp(
        (
          object.x +
          object.width / 2
        ) / 1000,
        0.04,
        0.96,
      ),

    y:
      object.layoutY ??
      clamp(
        (
          object.y +
          object.height / 2
        ) / 620,
        0.04,
        0.96,
      ),
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

  const [
    isObjectEditing,
    setIsObjectEditing,
  ] = useState(false);

  const [
    selectedObjectId,
    setSelectedObjectId,
  ] = useState<string | null>(
    null,
  );

  const [
    objectDraft,
    setObjectDraft,
  ] =
    useState<ObjectDraft | null>(
      null,
    );

  const [
    objectDrag,
    setObjectDrag,
  ] =
    useState<ObjectDrag>(null);

  const [
    objectDragPreview,
    setObjectDragPreview,
  ] =
    useState<ObjectDragPreview>(
      null,
    );

  const [
    objectError,
    setObjectError,
  ] = useState("");

  const [
    isObjectSaving,
    setIsObjectSaving,
  ] = useState(false);

  const canvasRef =
    useRef<HTMLDivElement | null>(
      null,
    );

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

  const editableObjects =
    useMemo(
      () =>
        objects.filter(
          (object) =>
            object.id !==
              "setup-main-structure" &&
            (
              object.type ===
                "tree" ||
              object.type ===
                "fence"
            ),
        ),
      [objects],
    );

  const selectedObject =
    useMemo(
      () =>
        editableObjects.find(
          (object) =>
            object.id ===
            selectedObjectId,
        ) ?? null,
      [
        editableObjects,
        selectedObjectId,
      ],
    );

  function selectObject(
    object: PropertyObject,
  ) {
    const size =
      getObjectSize(object);

    setSelectedObjectId(
      object.id,
    );

    setObjectDraft({
      id:
        object.id,

      widthM:
        String(
          size.widthM,
        ),

      depthM:
        String(
          size.depthM,
        ),

      rotation:
        String(
          object.rotation ??
            0,
        ),

      physicalHeightM:
        String(
          object.physicalHeightM ??
            (
              object.type ===
              "tree"
                ? 4
                : 1.8
            ),
        ),
    });

    setObjectError("");
  }

  async function handleAddTree() {
    setObjectError("");
    setIsObjectSaving(true);

    try {
      const id =
        await createPropertyObject({
          type: "tree",
          name: "Tree",

          // Legacy map compatibility.
          x: 675,
          y: 120,
          width: 90,
          height: 90,

          // New property layout.
          layoutX: 0.72,
          layoutY: 0.28,

          // Approximate canopy.
          widthM: 4.5,
          depthM: 4.5,

          rotation: 0,

          physicalHeightM: 4,
        });

      setIsObjectEditing(true);

      setSelectedObjectId(
        id,
      );

      setObjectDraft({
        id,
        widthM: "4.5",
        depthM: "4.5",
        rotation: "0",
        physicalHeightM: "4",
      });
    } catch (error) {
      console.error(
        "Unable to add tree:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The tree could not be added.",
      );
    } finally {
      setIsObjectSaving(false);
    }
  }

  async function handleAddFence() {
    setObjectError("");
    setIsObjectSaving(true);

    try {
      const id =
        await createPropertyObject({
          type: "fence",
          name: "Fence",

          // Legacy compatibility.
          x: 390,
          y: 500,
          width: 220,
          height: 14,

          // New property layout.
          layoutX: 0.5,
          layoutY: 0.82,

          widthM: 8,
          depthM: 0.35,

          rotation: 0,

          physicalHeightM: 1.8,
        });

      setIsObjectEditing(true);

      setSelectedObjectId(
        id,
      );

      setObjectDraft({
        id,
        widthM: "8",
        depthM: "0.35",
        rotation: "0",
        physicalHeightM:
          "1.8",
      });
    } catch (error) {
      console.error(
        "Unable to add fence:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The fence could not be added.",
      );
    } finally {
      setIsObjectSaving(false);
    }
  }

  function startObjectDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
    object: PropertyObject,
  ) {
    if (!isObjectEditing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    selectObject(
      object,
    );

    const rectangle =
      canvas.getBoundingClientRect();

    const savedPosition =
      getObjectPosition(
        object,
      );

    const centreX =
      rectangle.left +
      savedPosition.x *
        rectangle.width;

    const centreY =
      rectangle.top +
      savedPosition.y *
        rectangle.height;

    setObjectDrag({
      id:
        object.id,

      offsetX:
        event.clientX -
        centreX,

      offsetY:
        event.clientY -
        centreY,
    });

    setObjectDragPreview({
      id:
        object.id,

      x:
        savedPosition.x,

      y:
        savedPosition.y,
    });

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );
  }

  function moveObjectDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
    object: PropertyObject,
  ) {
    if (
      !isObjectEditing ||
      objectDrag?.id !==
        object.id
    ) {
      return;
    }

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const rectangle =
      canvas.getBoundingClientRect();

    const x =
      (
        event.clientX -
        rectangle.left -
        objectDrag.offsetX
      ) /
      rectangle.width;

    const y =
      (
        event.clientY -
        rectangle.top -
        objectDrag.offsetY
      ) /
      rectangle.height;

    setObjectDragPreview({
      id:
        object.id,

      x:
        clamp(
          x,
          0.03,
          0.97,
        ),

      y:
        clamp(
          y,
          0.03,
          0.97,
        ),
    });
  }

  function finishObjectDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
    object: PropertyObject,
  ) {
    if (
      !isObjectEditing ||
      objectDrag?.id !==
        object.id
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        );
    }

    const preview =
      objectDragPreview;

    setObjectDrag(null);
    setObjectDragPreview(null);

    if (
      !preview ||
      preview.id !==
        object.id
    ) {
      return;
    }

    void updatePropertyObject(
      object.id,
      {
        layoutX:
          preview.x,

        layoutY:
          preview.y,
      },
    ).catch((error) => {
      console.error(
        "Unable to save object position:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The new position could not be saved.",
      );
    });
  }

  async function handleSaveObject() {
    if (
      !selectedObject ||
      !objectDraft
    ) {
      return;
    }

    const widthM =
      Number(
        objectDraft.widthM,
      );

    const depthM =
      Number(
        objectDraft.depthM,
      );

    const rotation =
      Number(
        objectDraft.rotation,
      );

    const physicalHeightM =
      Number(
        objectDraft
          .physicalHeightM,
      );

    if (
      !Number.isFinite(
        widthM,
      ) ||
      widthM <= 0 ||
      !Number.isFinite(
        depthM,
      ) ||
      depthM <= 0
    ) {
      setObjectError(
        "Enter valid dimensions.",
      );

      return;
    }

    if (
      !Number.isFinite(
        rotation,
      )
    ) {
      setObjectError(
        "Enter a valid rotation.",
      );

      return;
    }

    if (
      !Number.isFinite(
        physicalHeightM,
      ) ||
      physicalHeightM <= 0
    ) {
      setObjectError(
        "Enter a valid physical height.",
      );

      return;
    }

    setObjectError("");
    setIsObjectSaving(true);

    try {
      await updatePropertyObject(
        selectedObject.id,
        {
          widthM,
          depthM,

          rotation,

          physicalHeightM,
        },
      );
    } catch (error) {
      console.error(
        "Unable to save property object:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The object could not be saved.",
      );
    } finally {
      setIsObjectSaving(false);
    }
  }

  async function handleDeleteObject() {
    if (!selectedObject) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${selectedObject.name}"?\n\nThis cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await deletePropertyObject(
        selectedObject.id,
      );

      setSelectedObjectId(
        null,
      );

      setObjectDraft(
        null,
      );
    } catch (error) {
      console.error(
        "Unable to delete property object:",
        error,
      );

      setObjectError(
        error instanceof Error
          ? error.message
          : "The object could not be deleted.",
      );
    }
  }

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

  spaces.forEach(
    (space) => {
      dimensions.push(
        space.widthM,
        space.depthM,
      );
    },
  );

  if (
    structure?.boundary
  ) {
    const size =
      getBoundarySize(
        structure.boundary,
      );

    dimensions.push(
      structure.widthM ??
        size.width,

      structure.depthM ??
        size.depth,
    );
  }

  editableObjects.forEach(
    (object) => {
      const size =
        getObjectSize(
          object,
        );

      dimensions.push(
        size.widthM,
        size.depthM,
      );
    },
  );

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

        <button
          type="button"
          className="saved-property-edit-button"
          onClick={() => {
            window.location.assign(
              "/setup-property?edit=1",
            );
          }}
        >
          ✏ Edit layout
        </button>
      </div>

      <div className="saved-property-object-toolbar">
        <button
          type="button"
          className={
            isObjectEditing
              ? "saved-object-toolbar-button saved-object-toolbar-button-active"
              : "saved-object-toolbar-button"
          }
          onClick={() => {
            setIsObjectEditing(
              (current) =>
                !current,
            );

            if (
              isObjectEditing
            ) {
              setSelectedObjectId(
                null,
              );

              setObjectDraft(
                null,
              );
            }
          }}
        >
          {isObjectEditing
            ? "✓ Done editing"
            : "✥ Manage objects"}
        </button>

        <button
          type="button"
          className="saved-object-toolbar-button"
          disabled={
            isObjectSaving
          }
          onClick={() => {
            void handleAddTree();
          }}
        >
          + 🌳 Tree
        </button>

        <button
          type="button"
          className="saved-object-toolbar-button"
          disabled={
            isObjectSaving
          }
          onClick={() => {
            void handleAddFence();
          }}
        >
          + Fence
        </button>
      </div>

      {objectError && (
        <p className="saved-object-error">
          {objectError}
        </p>
      )}

      <div
        ref={canvasRef}
        className="saved-property-layout-canvas"
      >
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
            const boundarySize =
              getBoundarySize(
                structure.boundary!,
              );

            const width =
              structure.widthM ??
              boundarySize.width;

            const depth =
              structure.depthM ??
              boundarySize.depth;

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
                    width *
                    pixelsPerMetre
                  }px`,

                  height: `${
                    depth *
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
                    viewBox={`0 0 ${width} ${depth}`}
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
                  {width}m ×{" "}
                  {depth}m
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

        {editableObjects.map(
          (object) => {
            const size =
              getObjectSize(
                object,
              );

            const savedPosition =
              getObjectPosition(
                object,
              );

            const preview =
              objectDragPreview
                ?.id ===
              object.id
                ? objectDragPreview
                : null;

            const position =
              preview ??
              savedPosition;

            const isSelected =
              selectedObjectId ===
              object.id;

            return (
              <div
                key={object.id}
                className={[
                  "saved-layout-object",
                  object.type ===
                  "tree"
                    ? "saved-layout-tree"
                    : "saved-layout-fence",
                  isObjectEditing
                    ? "saved-layout-object-editing"
                    : "",
                  isSelected
                    ? "saved-layout-object-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: `${
                    position.x *
                    100
                  }%`,

                  top: `${
                    position.y *
                    100
                  }%`,

                  width: `${
                    size.widthM *
                    pixelsPerMetre
                  }px`,

                  height: `${
                    size.depthM *
                    pixelsPerMetre
                  }px`,
                }}
                onPointerDown={(
                  event,
                ) =>
                  startObjectDrag(
                    event,
                    object,
                  )
                }
                onPointerMove={(
                  event,
                ) =>
                  moveObjectDrag(
                    event,
                    object,
                  )
                }
                onPointerUp={(
                  event,
                ) =>
                  finishObjectDrag(
                    event,
                    object,
                  )
                }
                onPointerCancel={(
                  event,
                ) =>
                  finishObjectDrag(
                    event,
                    object,
                  )
                }
              >
                <div
                  className="saved-object-shape"
                  style={{
                    transform: `rotate(${
                      object.rotation ??
                      0
                    }deg)`,
                  }}
                >
                  {object.type ===
                    "tree" && (
                    <span className="saved-tree-icon">
                      🌳
                    </span>
                  )}
                </div>

                <span className="saved-object-label">
                  {object.name}
                </span>
              </div>
            );
          },
        )}
      </div>

      {isObjectEditing && (
        <p className="saved-object-help">
          Drag trees and fences
          directly on the map. Tap
          one to change its
          dimensions, height or
          rotation.
        </p>
      )}

      {isObjectEditing &&
        selectedObject &&
        objectDraft && (
          <section className="saved-object-inspector">
            <div className="saved-object-inspector-heading">
              <div>
                <strong>
                  {selectedObject.name}
                </strong>

                <small>
                  {selectedObject.type ===
                  "tree"
                    ? "Tree dimensions and height"
                    : "Fence dimensions and height"}
                </small>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedObjectId(
                    null,
                  );

                  setObjectDraft(
                    null,
                  );
                }}
              >
                ×
              </button>
            </div>

            <div className="saved-object-inspector-fields">
              <label>
                {selectedObject.type ===
                "tree"
                  ? "Canopy width"
                  : "Fence length"}

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      objectDraft.widthM
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                widthM:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>m</span>
                </div>
              </label>

              <label>
                {selectedObject.type ===
                "tree"
                  ? "Canopy depth"
                  : "Fence thickness"}

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      objectDraft.depthM
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                depthM:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>m</span>
                </div>
              </label>

              <label>
                {selectedObject.type ===
                "tree"
                  ? "Tree height"
                  : "Fence height"}

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      objectDraft
                        .physicalHeightM
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                physicalHeightM:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>m</span>
                </div>
              </label>

              <label>
                Rotation

                <div className="saved-object-input">
                  <input
                    type="number"
                    min="0"
                    max="359"
                    step="1"
                    value={
                      objectDraft.rotation
                    }
                    onChange={(
                      event,
                    ) =>
                      setObjectDraft(
                        (
                          current,
                        ) =>
                          current
                            ? {
                                ...current,
                                rotation:
                                  event
                                    .target
                                    .value,
                              }
                            : current,
                      )
                    }
                  />

                  <span>°</span>
                </div>
              </label>
            </div>

            <div className="saved-object-inspector-actions">
              <button
                type="button"
                className="saved-object-delete-button"
                onClick={() => {
                  void handleDeleteObject();
                }}
              >
                Delete
              </button>

              <button
                type="button"
                className="saved-object-save-button"
                disabled={
                  isObjectSaving
                }
                onClick={() => {
                  void handleSaveObject();
                }}
              >
                {isObjectSaving
                  ? "Saving…"
                  : "Save object"}
              </button>
            </div>
          </section>
        )}
    </section>
  );
}