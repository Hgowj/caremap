declare module "*.geojson" {
  const value: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: {
        type: string;
        coordinates: number[];
      };
      properties: Record<string, any>;
    }>;
  };
  export default value;
}