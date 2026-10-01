# kotlinx.serialization: keep generated serializers of our API models.
-keepattributes *Annotation*, InnerClasses
-keep,includedescriptorclasses class app.nobatet.**$$serializer { *; }
-keepclassmembers class app.nobatet.** { *** Companion; }
-keepclasseswithmembers class app.nobatet.** { kotlinx.serialization.KSerializer serializer(...); }
# Retrofit interfaces are used through reflection.
-keep,allowobfuscation interface app.nobatet.data.** { *; }
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.osmdroid.**
