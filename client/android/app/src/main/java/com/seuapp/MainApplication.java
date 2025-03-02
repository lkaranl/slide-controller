import com.seuapp.VolumeButtonModule;

@Override
protected ReactNativeHost createReactNativeHost() {
  return new DefaultReactNativeHost(this) {
    // ...
    
    // Adicione ou modifique esta linha para desabilitar o modo Bridgeless
    @Override
    protected boolean isBridgeless() {
      return false; // Desabilita o modo Bridgeless
    }
    
    // ...
  };
}

@Override
protected List<ReactPackage> getPackages() {
  List<ReactPackage> packages = new PackageList(this).getPackages();
  // Adicione o pacote personalizado à lista
  packages.add(new VolumeButtonPackage());
  packages.add(new BackgroundServicePackage());
  packages.add(new VolumeControlPackage());
  packages.add(new NetworkInfoPackage());
  return packages;
} 