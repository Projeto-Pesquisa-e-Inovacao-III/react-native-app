import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ------------------------------------------------------------------
// Tipos de tab disponíveis para o personal (versão portada da web)
// ------------------------------------------------------------------
export type TabName = 'home' | 'schedule' | 'requests' | 'users' | 'more';

type Props = {
  activeTab?: TabName;
  onTabPress?: (tab: TabName) => void;
};

// ------------------------------------------------------------------
// Ícones SVG — mesmos paths do UserHeaderMobile.tsx da web
// ------------------------------------------------------------------

function IconHome({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#B3B3B3';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 21V13C15 12.7348 14.8946 12.4804 14.7071 12.2929C14.5196 12.1054 14.2652 12 14 12H10C9.73478 12 9.48043 12.1054 9.29289 12.2929C9.10536 12.4804 9 12.7348 9 13V21"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M3 9.99999C2.99993 9.70906 3.06333 9.42161 3.18579 9.15771C3.30824 8.8938 3.4868 8.65979 3.709 8.47199L10.709 2.47199C11.07 2.1669 11.5274 1.99951 12 1.99951C12.4726 1.99951 12.93 2.1669 13.291 2.47199L20.291 8.47199C20.5132 8.65979 20.6918 8.8938 20.8142 9.15771C20.9367 9.42161 21.0001 9.70906 21 9.99999V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V9.99999Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconSchedule({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#B3B3B3';
  return (
    <Svg width={25} height={24} viewBox="0 0 25 24" fill="none">
      <Path d="M8.5 2V6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.5 2V6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M19.5 4H5.5C4.39543 4 3.5 4.89543 3.5 6V20C3.5 21.1046 4.39543 22 5.5 22H19.5C20.6046 22 21.5 21.1046 21.5 20V6C21.5 4.89543 20.6046 4 19.5 4Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M3.5 10H21.5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconRequests({ active }: { active: boolean }) {
  // Eye icon — o web usa <Eye color="#B3B3B3" /> do lucide-react
  const c = active ? '#ffffff' : '#B3B3B3';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconUsers({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#B3B3B3';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M16 3.12799C16.8578 3.35036 17.6174 3.85125 18.1597 4.55205C18.702 5.25285 18.9962 6.11388 18.9962 6.99999C18.9962 7.8861 18.702 8.74713 18.1597 9.44793C17.6174 10.1487 16.8578 10.6496 16 10.872"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconMore({ active }: { active: boolean }) {
  const c = active ? '#ffffff' : '#B8B8B8';
  return (
    <Svg width={25} height={24} viewBox="0 0 25 24" fill="none">
      <Path
        d="M12.5 13C13.0523 13 13.5 12.5523 13.5 12C13.5 11.4477 13.0523 11 12.5 11C11.9477 11 11.5 11.4477 11.5 12C11.5 12.5523 11.9477 13 12.5 13Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M19.5 13C20.0523 13 20.5 12.5523 20.5 12C20.5 11.4477 20.0523 11 19.5 11C18.9477 11 18.5 11.4477 18.5 12C18.5 12.5523 18.9477 13 19.5 13Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M5.5 13C6.05228 13 6.5 12.5523 6.5 12C6.5 11.4477 6.05228 11 5.5 11C4.94772 11 4.5 11.4477 4.5 12C4.5 12.5523 4.94772 13 5.5 13Z"
        stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

// ------------------------------------------------------------------
// Componente de cada tab — equivalente ao HeaderIconsMobile da web
// ------------------------------------------------------------------
type TabItemProps = {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabItem({ icon, label, active, onPress }: TabItemProps) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ------------------------------------------------------------------
// Bottom Tab Bar — equivalente ao UserHeaderMobile (personal) da web
// CSS: position:sticky; bottom:0; height:60px; bg:var(--bg-blue)=#192633;
//      grid-template-columns: repeat(5, 1fr)
// ------------------------------------------------------------------
export default function BottomTabBar({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  const press = (tab: TabName) => onTabPress?.(tab);

  return (
    <View style={[styles.bar, { height: 60 + bottomInset, paddingBottom: bottomInset }]}>
      <TabItem
        icon={<IconHome active={activeTab === 'home'} />}
        label="Início"
        active={activeTab === 'home'}
        onPress={() => press('home')}
      />
      <TabItem
        icon={<IconSchedule active={activeTab === 'schedule'} />}
        label="Agenda"
        active={activeTab === 'schedule'}
        onPress={() => press('schedule')}
      />
      <TabItem
        icon={<IconRequests active={activeTab === 'requests'} />}
        label="Solicitações"
        active={activeTab === 'requests'}
        onPress={() => press('requests')}
      />
      <TabItem
        icon={<IconUsers active={activeTab === 'users'} />}
        label="Usuários"
        active={activeTab === 'users'}
        onPress={() => press('users')}
      />
      <TabItem
        icon={<IconMore active={activeTab === 'more'} />}
        label="Mais opções"
        active={activeTab === 'more'}
        onPress={() => press('more')}
      />
    </View>
  );
}

// ------------------------------------------------------------------
// Styles — mapeados do CSS:
// height: 60px | bg: #192633 (var(--bg-blue)) | position fixed bottom
// .headerIconsMobile: flex-col, align-center, justify-center, height:100%
// span: font-size:0.8rem (12.8px); margin-top:2px; max-width:75px; ellipsis
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  bar: {
    width: '100%',
    backgroundColor: '#192633',   // var(--bg-blue)
    flexDirection: 'row',         // grid-template-columns → row
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  tabItem: {
    flex: 1,                      // repeat(5, 1fr)
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 10,                 // ~0.8rem
    marginTop: 2,
    color: '#B3B3B3',
    maxWidth: 75,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
