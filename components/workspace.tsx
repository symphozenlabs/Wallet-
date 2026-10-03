import { ReactNode } from 'react';
import { Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from './ui';
export function Workspace({children,title,subtitle,back=false}:{children:ReactNode;title:string;subtitle:string;back?:boolean}){
  const router=useRouter();return <ScrollView style={{backgroundColor:colors.paper}} contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">
    <View style={w.header}><Pressable accessibilityRole="button" onPress={()=>router.replace('/home')}><Text style={w.logo}>◈ wallet</Text></Pressable><Text style={w.small}>SHARED LIFE. SIMPLE MONEY.</Text></View>
    <View style={w.page}>{back&&<Pressable accessibilityRole="button" onPress={()=>router.replace('/home')}><Text style={w.link}>← All groups</Text></Pressable>}<View style={{gap:8}}><Text style={w.title}>{title}</Text><Text style={w.muted}>{subtitle}</Text></View>{children}</View>
  </ScrollView>;
}
export function Card({children}:{children:ReactNode}){return <View style={w.card}>{children}</View>;}
export function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[w.chip,selected&&{backgroundColor:colors.green,borderColor:colors.green}]}><Text style={{color:selected?'#fff':colors.ink,fontWeight:'600'}}>{label}</Text></Pressable>;}
export const w=StyleSheet.create({
  header:{padding:24,borderBottomWidth:1,borderColor:colors.line,flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',alignItems:'center',gap:12},logo:{fontSize:29,fontWeight:'700',color:colors.green,letterSpacing:-1},small:{fontSize:10,letterSpacing:1.6,color:colors.muted},
  page:{width:'100%',maxWidth:1080,alignSelf:'center',padding:24,paddingBottom:64,gap:24},title:{fontSize:34,fontWeight:'700',color:colors.ink,letterSpacing:-1},muted:{color:colors.muted,fontSize:15,lineHeight:23},card:{borderWidth:1,borderColor:colors.line,backgroundColor:'#fff',borderRadius:18,padding:24,gap:18},heading:{color:colors.ink,fontSize:21,fontWeight:'700'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingHorizontal:15,minHeight:44,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper},link:{color:colors.green,fontSize:14,paddingVertical:8,fontWeight:'600'},amount:{fontSize:30,color:colors.green,fontWeight:'700'},divider:{height:1,backgroundColor:colors.line}
});
