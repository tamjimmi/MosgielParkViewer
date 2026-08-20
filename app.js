// ====================================
// CESIUM ION TOKEN
// ====================================

Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiOWEzMmEzZC0yYTMyLTQyZTQtOTNhZC04OWY4YzI5ZmVkMjEiLCJpZCI6MzMyMjg4LCJzdWIiOiJUYW0uTmd1eWVuIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6IlNhbmRDYXN0bGUgVGVzdCIsImlhdCI6MTc4NjY1NjQ3NH0.FdQ-pCjtwX7sQAHqV6E0OARj2tJVdKZt90htDjP6Fn4";

// ====================================
// ASSETS
// ====================================

const DESIGN_ASSET_ID = 5124279;
const CLIP_ASSET_ID = 5137355;

// ====================================
// PERFORMANCE SETTINGS
// ====================================

// Higher number = faster but less detail.
const GOOGLE_SCREEN_SPACE_ERROR = 24;
const DESIGN_SCREEN_SPACE_ERROR = 128;

// Try 0.5 if it is still slow.
const RESOLUTION_SCALE = 0.75;

// Tile cache limits in MB.
const GOOGLE_CACHE_MB = 256;
const DESIGN_CACHE_MB = 192;

// ====================================
// VIEWER
// ====================================

const viewer = new Cesium.Viewer(
    "cesiumContainer",
    {
        timeline: false,
        animation: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        homeButton: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        selectionIndicator: false,
        infoBox: false,

        geocoder:
            Cesium.IonGeocodeProviderType.GOOGLE,

        globe: false,

        requestRenderMode: true,

        maximumRenderTimeChange:
            Infinity,

        useBrowserRecommendedResolution:
            true
    }
);

// ====================================
// FAST CAMERA CONTROLS
// ====================================

const controller =
    viewer.scene
        .screenSpaceCameraController;

// Remove delayed camera movement.
controller.inertiaSpin = 0.0;
controller.inertiaTranslate = 0.0;
controller.inertiaZoom = 0.0;

// More direct zoom and orbit.
controller.maximumMovementRatio = 0.12;

// Allow close zoom.
controller.minimumZoomDistance = 0.5;

// Maximum camera distance.
controller.maximumZoomDistance =
    10000000;

// No collision checks because globe is off.
controller.enableCollisionDetection =
    false;

controller.enableInputs = true;
controller.enableZoom = true;
controller.enableRotate = true;
controller.enableTilt = true;
controller.enableLook = true;
controller.enableTranslate = true;

// ====================================
// GENERAL PERFORMANCE
// ====================================

viewer.resolutionScale =
    RESOLUTION_SCALE;

viewer.shadows = false;

viewer.scene.shadowMap.enabled =
    false;

viewer.scene.fog.enabled =
    false;

viewer.scene.skyAtmosphere.show =
    false;

viewer.scene.requestRenderMode =
    true;

viewer.scene.maximumRenderTimeChange =
    Infinity;

// Reduce anti-aliasing workload.
viewer.scene.msaaSamples = 1;

if (
    viewer.scene.postProcessStages &&
    viewer.scene.postProcessStages.fxaa
) {
    viewer.scene.postProcessStages
        .fxaa.enabled = false;
}

// Required for measurement picking.
viewer.scene.useDepthPicking =
    true;

// Change to true only for testing.
viewer.scene.debugShowFramesPerSecond =
    false;

// ====================================
// GOOGLE PHOTOREALISTIC 3D TILES
// ====================================

const googleTileset =
    await Cesium
        .createGooglePhotorealistic3DTileset(
            {
                onlyUsingWithGoogleGeocoder:
                    true
            }
        );

googleTileset.maximumScreenSpaceError =
    GOOGLE_SCREEN_SPACE_ERROR;

googleTileset.cacheBytes =
    GOOGLE_CACHE_MB *
    1024 *
    1024;

googleTileset.maximumCacheOverflowBytes =
    64 *
    1024 *
    1024;

googleTileset.preloadWhenHidden =
    false;

googleTileset.preloadFlightDestinations =
    false;

googleTileset.preferLeaves =
    false;

viewer.scene.primitives.add(
    googleTileset
);

// ====================================
// DESIGN MODEL
// ====================================

const designTileset =
    await Cesium
        .Cesium3DTileset
        .fromIonAssetId(
            DESIGN_ASSET_ID,
            {
                maximumScreenSpaceError:
                    DESIGN_SCREEN_SPACE_ERROR,

                cacheBytes:
                    DESIGN_CACHE_MB *
                    1024 *
                    1024,

                maximumCacheOverflowBytes:
                    64 *
                    1024 *
                    1024,

                preloadWhenHidden:
                    false,

                preloadFlightDestinations:
                    false,

                preferLeaves:
                    false
            }
        );

viewer.scene.primitives.add(
    designTileset
);

// ====================================
// LOAD CLIPPING GEOJSON
// ====================================

const clipResource =
    await Cesium.IonResource
        .fromAssetId(
            CLIP_ASSET_ID
        );

const clipData =
    await Cesium.GeoJsonDataSource
        .load(
            clipResource,
            {
                clampToGround: true
            }
        );

await viewer.dataSources.add(
    clipData
);

// ====================================
// FIND CLIPPING POLYGON
// ====================================

const footprint =
    clipData.entities.values.find(
        entity => entity.polygon
    );

if (!footprint) {
    throw new Error(
        `Polygon not found in asset ${CLIP_ASSET_ID}`
    );
}

// Hide boundary but keep it for clipping.
footprint.show = false;

footprint.polygon.material =
    Cesium.Color.YELLOW
        .withAlpha(0.25);

footprint.polygon.outline =
    true;

footprint.polygon.outlineColor =
    Cesium.Color.RED;

// ====================================
// CLIPPING
// ====================================

let clippingPolygons = null;

try {
    const hierarchy =
        footprint.polygon
            .hierarchy
            .getValue(
                viewer.clock.currentTime
            );

    const rawPositions =
        hierarchy.positions;

    console.log(
        "Polygon positions:",
        rawPositions.length
    );

    const cleanPositions = [];

    for (
        let i = 0;
        i < rawPositions.length;
        i++
    ) {
        const cartographic =
            Cesium.Cartographic
                .fromCartesian(
                    rawPositions[i]
                );

        cleanPositions.push(
            Cesium.Cartesian3
                .fromRadians(
                    cartographic.longitude,
                    cartographic.latitude,
                    0
                )
        );
    }

    clippingPolygons =
        new Cesium
            .ClippingPolygonCollection(
                {
                    polygons: [
                        new Cesium
                            .ClippingPolygon(
                                {
                                    positions:
                                        cleanPositions
                                }
                            )
                    ]
                }
            );

    googleTileset.clippingPolygons =
        clippingPolygons;

    console.log(
        "CLIPPING APPLIED SUCCESSFULLY"
    );
} catch (error) {
    console.error(
        "CLIPPING ERROR >>>",
        error
    );
}

// ====================================
// STANDARD CAMERA VIEW
// ====================================

const modelViewOffset =
    new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(90),
        Cesium.Math.toRadians(-35),
        400
    );

async function zoomToModel() {
    clearActiveTool();

    await viewer.flyTo(
        designTileset,
        {
            offset:
                modelViewOffset,

            duration:
                0.35
        }
    );

    viewer.scene.requestRender();
}

// ====================================
// INITIAL VIEW
// ====================================

await viewer.flyTo(
    designTileset,
    {
        offset:
            modelViewOffset,

        duration:
            0
    }
);

viewer.scene.requestRender();

// ====================================
// GHD TOOLBOX
// ====================================

const toolbox =
    document.createElement("div");

toolbox.style.position =
    "absolute";

toolbox.style.top =
    "10px";

toolbox.style.left =
    "10px";

toolbox.style.width =
    "116px";

toolbox.style.background =
    "#000000";

toolbox.style.padding =
    "6px";

toolbox.style.borderRadius =
    "5px";

toolbox.style.border =
    "1px solid #333333";

toolbox.style.boxShadow =
    "0 2px 10px rgba(0,0,0,0.55)";

toolbox.style.zIndex =
    "1000";

toolbox.style.fontFamily =
    "Segoe UI, Arial, sans-serif";

toolbox.style.userSelect =
    "none";

document.body.appendChild(
    toolbox
);

// ====================================
// GHD TEXT HEADER
// ====================================

const logo =
    document.createElement("div");

logo.textContent =
    "GHD";

logo.style.color =
    "#ffffff";

logo.style.fontWeight =
    "700";

logo.style.fontSize =
    "25px";

logo.style.letterSpacing =
    "2px";

logo.style.textAlign =
    "center";

logo.style.marginBottom =
    "6px";

logo.style.paddingBottom =
    "5px";

logo.style.borderBottom =
    "1px solid #333333";

toolbox.appendChild(
    logo
);

// ====================================
// BUTTON CONTAINER
// ====================================

const buttonContainer =
    document.createElement("div");

toolbox.appendChild(
    buttonContainer
);

// ====================================
// BUTTON CREATOR
// ====================================

function addButton(
    text,
    callback
) {
    const button =
        document.createElement(
            "button"
        );

    button.textContent =
        text;

    button.style.display =
        "block";

    button.style.width =
        "100%";

    button.style.height =
        "23px";

    button.style.padding =
        "0 4px";

    button.style.margin =
        "0 0 3px 0";

    button.style.border =
        "1px solid #555555";

    button.style.borderRadius =
        "3px";

    button.style.background =
        "#242424";

    button.style.color =
        "#ffffff";

    button.style.fontSize =
        "10px";

    button.style.fontFamily =
        "Segoe UI, Arial, sans-serif";

    button.style.cursor =
        "pointer";

    button.style.textAlign =
        "center";

    button.addEventListener(
        "mouseenter",
        function () {
            button.style.background =
                "#3a3a3a";
        }
    );

    button.addEventListener(
        "mouseleave",
        function () {
            button.style.background =
                "#242424";
        }
    );

    button.addEventListener(
        "click",
        callback
    );

    buttonContainer.appendChild(
        button
    );

    return button;
}

// ====================================
// INFORMATION PANEL
// ====================================

const info =
    document.createElement("div");

info.style.display =
    "none";

info.style.color =
    "#ffffff";

info.style.background =
    "#171717";

info.style.border =
    "1px solid #333333";

info.style.borderRadius =
    "3px";

info.style.fontSize =
    "9px";

info.style.lineHeight =
    "12px";

info.style.marginTop =
    "4px";

info.style.padding =
    "4px";

info.style.textAlign =
    "center";

info.style.wordBreak =
    "break-word";

toolbox.appendChild(
    info
);

function showInfo(message) {
    info.innerHTML = message;
    info.style.display = "block";
}

function hideInfo() {
    info.innerHTML = "";
    info.style.display = "none";
}

// ====================================
// MEASUREMENT STORAGE
// ====================================

let activeHandler = null;
let measurementEntities = [];

function addMeasurementEntity(
    options
) {
    const entity =
        viewer.entities.add(
            options
        );

    measurementEntities.push(
        entity
    );

    viewer.scene.requestRender();

    return entity;
}

// ====================================
// STOP ACTIVE TOOL
// ====================================

function clearActiveTool() {
    if (activeHandler) {
        activeHandler.destroy();
        activeHandler = null;
    }

    document.body.style.cursor =
        "default";
}

// ====================================
// SAFE POSITION PICKING
// ====================================

function pickPosition(
    windowPosition
) {
    let position;

    if (
        viewer.scene
            .pickPositionSupported
    ) {
        position =
            viewer.scene.pickPosition(
                windowPosition
            );
    }

    return position;
}

// ====================================
// FORMAT DISTANCE
// ====================================

function formatDistance(
    distance
) {
    if (distance >= 1000) {
        return (
            (
                distance /
                1000
            ).toFixed(2) +
            " km"
        );
    }

    return (
        distance.toFixed(2) +
        " m"
    );
}

// ====================================
// FORMAT AREA
// ====================================

function formatArea(area) {
    if (area >= 1000000) {
        return (
            (
                area /
                1000000
            ).toFixed(3) +
            " km²"
        );
    }

    if (area >= 10000) {
        return (
            (
                area /
                10000
            ).toFixed(3) +
            " ha"
        );
    }

    return (
        area.toFixed(1) +
        " m²"
    );
}

// ====================================
// DISTANCE TOOL
// ====================================

function startDistanceTool() {
    clearActiveTool();

    const points = [];

    document.body.style.cursor =
        "crosshair";

    showInfo(
        "DISTANCE<br>" +
        "Click first point"
    );

    activeHandler =
        new Cesium
            .ScreenSpaceEventHandler(
                viewer.canvas
            );

    activeHandler.setInputAction(
        function (click) {
            const position =
                pickPosition(
                    click.position
                );

            if (
                !Cesium.defined(
                    position
                )
            ) {
                showInfo(
                    "No surface found.<br>" +
                    "Click directly on the model."
                );

                return;
            }

            points.push(
                Cesium.Cartesian3.clone(
                    position
                )
            );

            addMeasurementEntity({
                position:
                    Cesium.Cartesian3
                        .clone(
                            position
                        ),

                point: {
                    pixelSize: 7,

                    color:
                        Cesium.Color.YELLOW,

                    outlineColor:
                        Cesium.Color.BLACK,

                    outlineWidth: 2,

                    disableDepthTestDistance:
                        Number
                            .POSITIVE_INFINITY
                }
            });

            if (
                points.length === 1
            ) {
                showInfo(
                    "DISTANCE<br>" +
                    "Click second point"
                );

                return;
            }

            if (
                points.length === 2
            ) {
                const distance =
                    Cesium.Cartesian3
                        .distance(
                            points[0],
                            points[1]
                        );

                const midpoint =
                    Cesium.Cartesian3
                        .midpoint(
                            points[0],
                            points[1],
                            new Cesium
                                .Cartesian3()
                        );

                addMeasurementEntity({
                    polyline: {
                        positions: [
                            Cesium.Cartesian3
                                .clone(
                                    points[0]
                                ),

                            Cesium.Cartesian3
                                .clone(
                                    points[1]
                                )
                        ],

                        width: 3,

                        material:
                            Cesium.Color
                                .YELLOW,

                        depthFailMaterial:
                            Cesium.Color
                                .YELLOW
                    }
                });

                addMeasurementEntity({
                    position:
                        midpoint,

                    label: {
                        text:
                            formatDistance(
                                distance
                            ),

                        font:
                            "12px Segoe UI",

                        fillColor:
                            Cesium.Color
                                .WHITE,

                        outlineColor:
                            Cesium.Color
                                .BLACK,

                        outlineWidth: 3,

                        style:
                            Cesium.LabelStyle
                                .FILL_AND_OUTLINE,

                        showBackground:
                            true,

                        backgroundColor:
                            Cesium.Color
                                .BLACK
                                .withAlpha(
                                    0.8
                                ),

                        backgroundPadding:
                            new Cesium
                                .Cartesian2(
                                    6,
                                    4
                                ),

                        pixelOffset:
                            new Cesium
                                .Cartesian2(
                                    0,
                                    -14
                                ),

                        disableDepthTestDistance:
                            Number
                                .POSITIVE_INFINITY
                    }
                });

                showInfo(
                    "DISTANCE<br><b>" +
                    formatDistance(
                        distance
                    ) +
                    "</b><br>" +
                    "Click for another"
                );

                points.length = 0;
            }

            viewer.scene.requestRender();
        },

        Cesium.ScreenSpaceEventType
            .LEFT_CLICK
    );
}

// ====================================
// LOCAL HORIZONTAL AREA
// ====================================

function calculateLocalArea(
    positions
) {
    if (
        positions.length < 3
    ) {
        return 0;
    }

    const localFrame =
        Cesium.Transforms
            .eastNorthUpToFixedFrame(
                positions[0]
            );

    const inverseFrame =
        Cesium.Matrix4.inverse(
            localFrame,
            new Cesium.Matrix4()
        );

    const localPositions =
        positions.map(
            function (position) {
                return Cesium.Matrix4
                    .multiplyByPoint(
                        inverseFrame,
                        position,
                        new Cesium
                            .Cartesian3()
                    );
            }
        );

    let area = 0;

    for (
        let i = 0;
        i <
        localPositions.length;
        i++
    ) {
        const current =
            localPositions[i];

        const next =
            localPositions[
                (
                    i + 1
                ) %
                localPositions.length
            ];

        area +=
            current.x *
                next.y -
            next.x *
                current.y;
    }

    return (
        Math.abs(area) *
        0.5
    );
}

// ====================================
// AREA TOOL
// ====================================

function startAreaTool() {
    clearActiveTool();

    const points = [];

    document.body.style.cursor =
        "crosshair";

    showInfo(
        "AREA<br>" +
        "Left click points<br>" +
        "Right click to finish"
    );

    activeHandler =
        new Cesium
            .ScreenSpaceEventHandler(
                viewer.canvas
            );

    activeHandler.setInputAction(
        function (click) {
            const position =
                pickPosition(
                    click.position
                );

            if (
                !Cesium.defined(
                    position
                )
            ) {
                showInfo(
                    "No surface found.<br>" +
                    "Click directly on the model."
                );

                return;
            }

            points.push(
                Cesium.Cartesian3.clone(
                    position
                )
            );

            addMeasurementEntity({
                position:
                    Cesium.Cartesian3
                        .clone(
                            position
                        ),

                point: {
                    pixelSize: 7,

                    color:
                        Cesium.Color.LIME,

                    outlineColor:
                        Cesium.Color.BLACK,

                    outlineWidth: 2,

                    disableDepthTestDistance:
                        Number
                            .POSITIVE_INFINITY
                }
            });

            showInfo(
                "AREA<br>" +
                points.length +
                (
                    points.length === 1
                        ? " point"
                        : " points"
                ) +
                "<br>" +
                (
                    points.length < 3
                        ? "Add more points"
                        : "Right click to finish"
                )
            );

            viewer.scene.requestRender();
        },

        Cesium.ScreenSpaceEventType
            .LEFT_CLICK
    );

    activeHandler.setInputAction(
        function () {
            if (
                points.length < 3
            ) {
                showInfo(
                    "AREA<br>" +
                    "Select at least 3 points"
                );

                return;
            }

            const finalPositions =
                points.map(
                    function (point) {
                        return Cesium
                            .Cartesian3
                            .clone(
                                point
                            );
                    }
                );

            const area =
                calculateLocalArea(
                    finalPositions
                );

            const boundingSphere =
                Cesium.BoundingSphere
                    .fromPoints(
                        finalPositions
                    );

            addMeasurementEntity({
                polygon: {
                    hierarchy:
                        new Cesium
                            .PolygonHierarchy(
                                finalPositions
                            ),

                    material:
                        Cesium.Color
                            .LIME
                            .withAlpha(
                                0.28
                            ),

                    outline: true,

                    outlineColor:
                        Cesium.Color.LIME,

                    perPositionHeight:
                        true
                }
            });

            const closedLine =
                finalPositions.concat(
                    [
                        Cesium.Cartesian3
                            .clone(
                                finalPositions[
                                    0
                                ]
                            )
                    ]
                );

            addMeasurementEntity({
                polyline: {
                    positions:
                        closedLine,

                    width: 3,

                    material:
                        Cesium.Color.LIME,

                    depthFailMaterial:
                        Cesium.Color.LIME
                }
            });

            addMeasurementEntity({
                position:
                    boundingSphere.center,

                label: {
                    text:
                        formatArea(
                            area
                        ),

                    font:
                        "12px Segoe UI",

                    fillColor:
                        Cesium.Color.WHITE,

                    outlineColor:
                        Cesium.Color.BLACK,

                    outlineWidth: 3,

                    style:
                        Cesium.LabelStyle
                            .FILL_AND_OUTLINE,

                    showBackground:
                        true,

                    backgroundColor:
                        Cesium.Color
                            .BLACK
                            .withAlpha(
                                0.8
                            ),

                    backgroundPadding:
                        new Cesium
                            .Cartesian2(
                                6,
                                4
                            ),

                    pixelOffset:
                        new Cesium
                            .Cartesian2(
                                0,
                                -12
                            ),

                    disableDepthTestDistance:
                        Number
                            .POSITIVE_INFINITY
                }
            });

            showInfo(
                "AREA<br><b>" +
                formatArea(area) +
                "</b><br>" +
                "Select Area again for another"
            );

            clearActiveTool();

            viewer.scene.requestRender();
        },

        Cesium.ScreenSpaceEventType
            .RIGHT_CLICK
    );
}

// ====================================
// CLEAR ALL MEASUREMENTS
// ====================================

function clearAllMeasurements() {
    clearActiveTool();

    for (
        const entity of
        measurementEntities
    ) {
        viewer.entities.remove(
            entity
        );
    }

    measurementEntities = [];

    hideInfo();

    viewer.scene.requestRender();
}

// ====================================
// TOOLBOX BUTTONS
// ====================================

addButton(
    "Zoom to Model",
    zoomToModel
);

addButton(
    "Distance",
    startDistanceTool
);

addButton(
    "Area",
    startAreaTool
);

addButton(
    "Toggle Design",
    function () {
        designTileset.show =
            !designTileset.show;

        viewer.scene.requestRender();
    }
);

addButton(
    "Toggle Clip",
    function () {
        if (
            clippingPolygons
        ) {
            clippingPolygons.enabled =
                !clippingPolygons
                    .enabled;

            viewer.scene.requestRender();
        }
    }
);

addButton(
    "Invert Clip",
    function () {
        if (
            clippingPolygons
        ) {
            clippingPolygons.inverse =
                !clippingPolygons
                    .inverse;

            viewer.scene.requestRender();
        }
    }
);

const clearButton =
    addButton(
        "Clear All",
        clearAllMeasurements
    );

clearButton.style.color =
    "#ffb3b3";

clearButton.style.borderColor =
    "#663333";

// ====================================
// FOOTER
// ====================================

const footer =
    document.createElement("div");

footer.innerHTML =
    "created by<br>" +
    "@tam.nguyen@ghd.com";

footer.style.color =
    "#555555";

footer.style.fontSize =
    "6px";

footer.style.lineHeight =
    "7px";

footer.style.textAlign =
    "center";

footer.style.marginTop =
    "5px";

footer.style.paddingTop =
    "3px";

footer.style.borderTop =
    "1px solid #222222";

toolbox.appendChild(
    footer
);

// ====================================
// FINAL RENDER
// ====================================

viewer.scene.requestRender();