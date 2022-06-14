// @ts-nocheck
const METADATA = {
	website: "https://shapez.mod.io/pipette-and-delete-on-wires-layer",
	author: "nabbydude",
	name: "Pipette and Delete on Wire Layer",
	version: "1.0.1",
	id: "wire-pipette-delete",
	description: "Allows pipette and delete of belt-layer buildings with wires pins from wires layer.",
	minimumGameVersion: ">=1.5.0",
	doesNotAffectSavegame: true,
};

const HUDBuildingPlacerLogic = () => ({
	onEditModeChanged(layer) {
		const metaBuilding = this.currentMetaBuilding.get();
		if (metaBuilding && metaBuilding.getLayer() !== layer && !(layer === "wires" && metaBuilding.getShowWiresLayerPreview())) {
			// This layer doesn't fit the edit mode anymore
			this.currentMetaBuilding.set(null);
		}
	},
	deleteBelowCursor() {
		const mousePosition = this.root.app.mousePosition;
		if (!mousePosition) {
				// Not on screen
				return false;
		}

		const worldPos = this.root.camera.screenToWorld(mousePosition);
		const tile = worldPos.toTileSpace();
		const layer = this.root.currentLayer;
		let contents = this.root.map.getTileContent(tile, layer);
		if (!contents && layer === "wires") {
			contents = this.root.map.getTileContent(tile, "regular");
			if (contents) {
				const buildingCode = contents.components.StaticMapEntity.code;
				const extracted = shapez.getBuildingDataFromCode(buildingCode);
				if (!extracted.metaClass.prototype.getShowWiresLayerPreview()) return false;
			}
		}
		if (contents && this.root.logic.tryDeleteBuilding(contents)) {
				this.root.soundProxy.playUi(shapez.SOUNDS.destroyBuilding);
				return true;
		}
		return false;
	},
	startPipette() {
		// Disable in overview
		if (this.root.camera.getIsMapOverlayActive()) {
				return;
		}

		const mousePosition = this.root.app.mousePosition;
		if (!mousePosition) {
				// Not on screen
				return;
		}

		const worldPos = this.root.camera.screenToWorld(mousePosition);
		const tile = worldPos.toTileSpace();

		let contents = this.root.map.getTileContent(tile, this.root.currentLayer);
		let buildingCode
		let extracted

		if (!contents && this.root.currentLayer === "wires") {
			contents = this.root.map.getTileContent(tile, "regular");
			if (contents) {
				buildingCode = contents.components.StaticMapEntity.code;
				extracted = shapez.getBuildingDataFromCode(buildingCode);
				if (!extracted.metaClass.prototype.getShowWiresLayerPreview()) contents = null;
			}
		}

		if (!contents) {
			const tileBelow = this.root.map.getLowerLayerContentXY(tile.x, tile.y);

			// Check if there's a shape or color item below, if so select the miner
				if (
						tileBelow &&
						this.root.app.settings.getAllSettings().pickMinerOnPatch &&
						this.root.currentLayer === "regular" &&
						this.root.gameMode.hasResources()
				) {
						this.currentMetaBuilding.set(shapez.gMetaBuildingRegistry.findByClass(shapez.MetaMinerBuilding));

						// Select chained miner if available, since that's always desired once unlocked
						if (this.root.hubGoals.isRewardUnlocked(shapez.enumHubGoalRewards.reward_miner_chainable)) {
								this.currentVariant.set(enumMinerVariants.chainable);
						}
				} else {
						this.currentMetaBuilding.set(null);
				}
				return;
		}

		// Try to extract the building
		if (!buildingCode) buildingCode = contents.components.StaticMapEntity.code;
		if (!extracted) extracted = shapez.getBuildingDataFromCode(buildingCode);

		// Disable pipetting the hub
		if (extracted.metaInstance.getId() === shapez.gMetaBuildingRegistry.findByClass(shapez.MetaHubBuilding).getId()) {
				this.currentMetaBuilding.set(null);
				return;
		}

		// Disallow picking excluded buildings
		if (this.root.gameMode.isBuildingExcluded(extracted.metaClass)) {
				this.currentMetaBuilding.set(null);
				return;
		}

		// If the building we are picking is the same as the one we have, clear the cursor.
		if (
				this.currentMetaBuilding.get() &&
				extracted.metaInstance.getId() === this.currentMetaBuilding.get().getId() &&
				extracted.variant === this.currentVariant.get()
		) {
				this.currentMetaBuilding.set(null);
				return;
		}

		this.currentMetaBuilding.set(extracted.metaInstance);
		this.currentVariant.set(extracted.variant);
		this.currentBaseRotation = contents.components.StaticMapEntity.rotation;
	},
});

class Mod extends shapez.Mod {
	init() {
			this.modInterface.extendClass(shapez.HUDBuildingPlacerLogic, HUDBuildingPlacerLogic);
	}
}
